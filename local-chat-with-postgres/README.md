# Local Chat with PostgreSQL/PostGIS

Discuter en langage naturel avec une base PostGIS, à l'aide d'un LLM local (Ollama) intégré à Open WebUI. Le modèle interroge la base par des outils MCP.

Tout est configuré au lancement : compte administrateur, connexion aux outils, modèle et prompt système. Il n'y a rien à cliquer avant la démo.

```
db (PostGIS) ──▶ db-mcp (serveur MCP, SSE) ──▶ mcpo (MCP → OpenAPI) ──▶ open-webui (+ Ollama intégré)
```

| Service | Image | Rôle |
|---|---|---|
| `db` | `postgis/postgis:17-3.6-alpine` | Base de démo, initialisée par [`init-scripts/`](init-scripts/) |
| `db-mcp` | [`crystaldba/postgres-mcp`](https://github.com/crystaldba/postgres-mcp) | Serveur MCP PostgreSQL (transport SSE), en lecture seule (`--access-mode=restricted`) |
| `mcpo` | [`ghcr.io/open-webui/mcpo`](https://github.com/open-webui/mcpo) | Expose les outils MCP en API OpenAPI, que lit Open WebUI ([`config/mcpo/config.json`](config/mcpo/config.json)) |
| `open-webui` | [`ghcr.io/open-webui/open-webui:ollama`](https://github.com/open-webui/open-webui) | Interface de chat avec Ollama intégré |

## Démarrer

```bash
docker compose up -d
```

Puis ouvrir http://localhost:3000 et se connecter avec `admin@example.com` / `demo`.

Au premier lancement, prévoir le téléchargement de l'image Open WebUI (10,8 Go) et du modèle `qwen2.5:3b` (1,9 Go). Ensuite, `docker compose up -d` rend la main en moins d'une minute : chaque service attend que le précédent soit prêt (sondes de santé).

Pour changer un réglage, copier `.env.example` en `.env` et l'adapter.

## Ce qui est configuré au lancement

| Élément | Comment |
|---|---|
| Compte administrateur | `WEBUI_ADMIN_EMAIL` et `WEBUI_ADMIN_PASSWORD`, au premier démarrage uniquement ; inscription désactivée |
| Connexion aux outils | `TOOL_SERVER_CONNECTIONS` vers `http://mcpo:8000/postgres` : 4 outils sur 9 (`execute_sql`, `list_schemas`, `list_objects`, `get_object_details`) |
| Outils actifs par défaut | `DEFAULT_MODEL_METADATA` : outil `server:postgres` coché sur tous les modèles ; outils intégrés d'Open WebUI (notes, automatisations…) coupés, car leurs descriptions saturent le contexte d'un petit modèle |
| Modèle | Le `post_start` d'`open-webui` télécharge `OLLAMA_MODEL`, puis crée `assistant-postgis` avec [`config/ollama/assistant-postgis.Modelfile`](config/ollama/assistant-postgis.Modelfile) : prompt système décrivant le schéma, contexte de 8 192 tokens |
| Modèle par défaut | `DEFAULT_MODELS=assistant-postgis:latest` |

`ENABLE_PERSISTENT_CONFIG=false` : la configuration vient de `compose.yml` à chaque démarrage, et les réglages faits dans l'interface d'administration ne sont pas conservés.

Le prompt système est dans le Modelfile, et non dans `DEFAULT_MODEL_PARAMS`, car Open WebUI 0.13.4 n'applique pas ce paramètre aux modèles Ollama de base.

## Données

La base est volatile (`tmpfs`) : elle est réinitialisée à chaque démarrage, il n'y a rien à nettoyer.

- **`natural_earth`** : `countries` (5 pays, géométries simplifiées, population, PIB), `cities` (12 villes, dont les capitales), vue `european_capitals`.
- **`demo`** : `stores` (5 magasins à Paris), `products` (10 produits), `store_inventory`, `sales`, vues `store_product_availability` et `sales_summary`.

Pour ajouter des données, créer un script `init-scripts/03-….sh` : les scripts sont exécutés dans l'ordre alphabétique.

Accès direct à la base :

```bash
docker compose exec db psql -U postgres -d database
```

## Questions de démo

Mesuré avec `qwen2.5:3b`, sur CPU (AMD Ryzen 7 7840U), chaque question posée deux fois dans une nouvelle conversation :

| Question | Résultat |
|---|---|
| Quel est le pays le plus peuplé de la base ? | ✅ ✅ |
| Quels sont les 5 produits les plus chers ? | ❌ ✅ |
| Liste les produits de la catégorie Electronics avec leur prix. | ❌ ✅ (un produit oublié au premier passage) |
| Quels sont les 3 magasins les plus proches de Notre-Dame de Paris (longitude 2.3499, latitude 48.8530) ? | ❌ ❌ (réussie lors d'un essai précédent) |
| Quelles villes françaises sont dans la base, avec leur population ? | ❌ ❌ |
| Quelles sont les capitales européennes de la base ? | ❌ ❌ |
| Quelle est la distance en kilomètres entre Paris et Berlin ? | ❌ ❌ |
| Donne le chiffre d'affaires par magasin à partir de la vue demo.sales_summary. | ❌ ❌ |

Le modèle appelle bien l'outil SQL, mais se trompe souvent de table ou de colonne, et invente parfois un résultat. Une réponse prend de 10 à 60 secondes, plus quand il corrige sa requête à plusieurs reprises.

Pour refaire ces mesures, [`scripts/ask.py`](scripts/ask.py) pose les questions comme l'interface, dans une nouvelle conversation, et affiche les requêtes SQL envoyées :

```bash
docker compose exec -T open-webui python3 - "Quel est le pays le plus peuplé de la base ?" < scripts/ask.py

# deux passages, avec un autre modèle (déjà présent dans Ollama)
docker compose exec -T -e REPEAT=2 -e MODEL=qwen2.5:3b open-webui python3 - "Question 1" "Question 2" < scripts/ask.py
```

Les conversations créées par le script apparaissent dans l'historique de l'interface.

## Limites

- **Modèle de 3B** : voir ci-dessus. `OLLAMA_MODEL` accepte n'importe quel modèle Ollama capable d'appeler des outils.
- **Lecture seule** : `db-mcp` tourne en `--access-mode=restricted` et refuse `CREATE`, `UPDATE`, etc. (« Error validating query »). Le modèle propose parfois ce genre de requête, sans effet.
- **Open WebUI tourne en root**, sans système de fichiers en lecture seule : l'image `:ollama` écrit dans `/root/.ollama` et `/app/backend`, et son volume de données est amorcé avec des fichiers appartenant à root. Les autres services tournent sans root et en lecture seule, avec des limites CPU et mémoire.
- **Accès local uniquement** : le port 3000 n'est publié que sur `127.0.0.1`.
- **API d'Open WebUI** : un appel à `/api/chat/completions` sans contexte de conversation (`chat_id`, `session_id`) renvoie au client les appels d'outil au lieu de les exécuter. Seule l'interface les exécute côté serveur.

## Arrêter

```bash
docker compose down      # garde le compte, l'historique et les modèles téléchargés
docker compose down -v   # supprime aussi les volumes (nouveau compte admin et nouveau téléchargement du modèle au prochain lancement)
```

Le compte administrateur n'est créé qu'au premier démarrage : pour changer `WEBUI_ADMIN_PASSWORD` après coup, il faut passer par `docker compose down -v`.

## Références

- Open WebUI, outils MCP : https://docs.openwebui.com/features/mcp
- Open WebUI, serveurs OpenAPI et mcpo : https://docs.openwebui.com/features/plugin/tools/openapi-servers/mcp
- Exemple Open WebUI + mcpo : https://lobehub.com/fr/mcp/baronco-open-webui-and-mcpo
- MCP, transport Streamable HTTP : https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http
- postgres-mcp : https://github.com/crystaldba/postgres-mcp
- PostGIS : https://postgis.net/documentation/
