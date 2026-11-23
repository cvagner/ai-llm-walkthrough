"""Pose des questions au modèle comme le ferait l'interface d'Open WebUI, et affiche les appels d'outil.

À lancer dans le conteneur open-webui (Python et les variables d'environnement y sont déjà) :

    docker compose exec -T open-webui python3 - "Quel est le pays le plus peuplé de la base ?" < scripts/ask.py

Chaque question ouvre une nouvelle conversation, avec un chat_id et un session_id : sans ce contexte,
/api/chat/completions renvoie les appels d'outil au client au lieu de les exécuter.

Variables facultatives : MODEL (défaut : DEFAULT_MODELS), REPEAT (nombre de passages, défaut : 1).
"""

import json
import os
import sys
import time
import urllib.request
import uuid

BASE = "http://localhost:8080"
MODEL = os.environ.get("MODEL") or os.environ.get("DEFAULT_MODELS", "").split(",")[0]
REPEAT = int(os.environ.get("REPEAT", "1"))


def request(path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data, headers), timeout=600) as response:
        return json.load(response)


def ask(question, token):
    start = time.time()
    response = request(
        "/api/chat/completions",
        {
            "model": MODEL,
            "stream": True,
            "parent_id": None,  # nouvelle conversation
            "session_id": "ask-" + uuid.uuid4().hex,
            "id": str(uuid.uuid4()),
            "tool_ids": ["server:postgres"],
            "messages": [{"role": "user", "content": question}],
        },
        token,
    )
    chat_id = response.get("chat_id") or (response.get("tasks") or [{}])[0].get("chat_id")
    if not chat_id:
        print(f"### {question}\nRéponse inattendue : {json.dumps(response)[:300]}\n")
        return

    # La réponse est produite en tâche de fond : on relit la conversation jusqu'à ce qu'elle soit terminée.
    message = {}
    for _ in range(300):
        time.sleep(2)
        messages = request(f"/api/v1/chats/{chat_id}", token=token)["chat"].get("history", {}).get("messages", {})
        answers = [m for m in messages.values() if m.get("role") == "assistant"]
        if answers and answers[-1].get("done"):
            message = answers[-1]
            break

    calls = [o for o in message.get("output") or [] if o.get("type") in ("function_call", "tool_call")]
    print(f"### {question}  ({time.time() - start:.0f} s, {len(calls)} appel(s) d'outil)")
    for call in calls:
        print(f"  {call.get('name')} {call.get('arguments')}")
    print((message.get("content") or "(réponse vide)").strip())
    print()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    token = request(
        "/api/v1/auths/signin",
        {"email": os.environ["WEBUI_ADMIN_EMAIL"], "password": os.environ["WEBUI_ADMIN_PASSWORD"]},
    )["token"]
    print(f"Modèle : {MODEL}\n")
    for run in range(1, REPEAT + 1):
        if REPEAT > 1:
            print(f"======== passage {run}/{REPEAT}\n")
        for question in sys.argv[1:]:
            ask(question, token)


main()
