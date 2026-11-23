// Rendu : ombres portées, reflets du sol par scène miroir, salle, joueurs instanciés, post-traitement.
const GL_LIGHT = `
uniform vec3 uCam; uniform mat4 uLVP; uniform sampler2DShadow uSh;
float shadow(vec3 wp){ vec4 l=uLVP*vec4(wp,1.); vec3 c=l.xyz/l.w*0.5+0.5; if(c.x<0.||c.x>1.||c.y<0.||c.y>1.||c.z>1.) return 1.;
  float s=0.; for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++) s+=texture(uSh,vec3(c.xy+vec2(float(i),float(j))*(1.4/2048.),c.z-0.003)); return s/9.; }
vec3 lit(vec3 alb,vec3 n,vec3 wp,float rough,float spec,float sss){
  vec3 L=normalize(vec3(0.22,1.,0.18)),v=normalize(uCam-wp); float sh=shadow(wp+n*0.03),nl=dot(n,L),d=max(nl,0.)*sh,wrap=max((nl+0.5)/1.5,0.)*sss;
  vec3 amb=mix(vec3(0.20,0.19,0.20),vec3(0.40,0.44,0.52),n.y*0.5+0.5);
  vec3 h=normalize(L+v); float sp=pow(max(dot(n,h),0.),mix(90.,8.,rough))*spec*sh;
  float fill=max(dot(n,normalize(vec3(-0.5,0.5,-0.7))),0.)*0.24+max(dot(n,normalize(vec3(0.6,0.45,0.65))),0.)*0.24;
  float rim=pow(1.-max(dot(n,v),0.),3.)*0.3*(n.y*0.5+0.5);
  vec3 c=alb*(amb*0.72+vec3(1.,0.97,0.92)*(d*1.5+fill)+wrap*vec3(0.30,0.12,0.08))+vec3(sp)+rim*vec3(0.6,0.7,0.8)*alb;
  return mix(c,vec3(0.03,0.04,0.065),1.-exp(-distance(uCam,wp)*0.006)); }`;
const VS_INST = `
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec4 i0; layout(location=3) in vec4 i1; layout(location=4) in vec4 i2; layout(location=5) in vec4 i3; layout(location=6) in vec4 iC; layout(location=7) in vec4 iQ;
uniform mat4 uVP; uniform float uMir,uTime,uCheer; out vec3 vW,vN,vL; out vec4 vC,vQ;
void main(){ vec3 lp=aP; lp.xz*=mix(1.,iQ.x,clamp(aP.y,0.,1.)); mat4 M=mat4(i0,i1,i2,i3); vec4 w=M*vec4(lp,1.);
  if(iC.a>6.5){ float ph=iQ.y*6.283; w.y+=max(0.,sin(uTime*(5.+iQ.y*3.)+ph))*uCheer*0.32+sin(uTime*1.3+ph)*0.012; }
  vec3 s=vec3(dot(i0.xyz,i0.xyz),dot(i1.xyz,i1.xyz),dot(i2.xyz,i2.xyz)); vec3 n=normalize(mat3(M)*(aN/s));
  w.y*=uMir; n.y*=uMir; vW=w.xyz; vN=n; vL=aP; vC=iC; vQ=iQ; gl_Position=uVP*w; }`;
const FS_INST = `
in vec3 vW,vN,vL; in vec4 vC,vQ; uniform float uMir; out vec4 o;` + GL_LIGHT + `
void main(){ if(uMir<0.&&vW.y>0.) discard; vec3 n=normalize(vN); int m=int(vC.a+0.5); vec3 a=vC.rgb; float rough=0.75,spec=0.12,sss=0.;
  if(m==1){ sss=1.; rough=0.5; spec=0.22; }
  else if(m==2){ float side=smoothstep(0.60,0.68,abs(vL.x)); a=mix(a,vQ.yzw,side); a=mix(a,vQ.yzw,step(0.9,vL.y)*0.9);
    float f=sin(vL.y*36.+sin(vL.x*8.+vL.z*5.)*2.2)*0.5+0.5; a*=0.92+0.08*f; rough=0.85; }
  else if(m==3){ sss=1.; rough=0.5; spec=0.2; vec3 q=vL;
    if(q.z>0.3){ float ex=abs(q.x)-0.4,ey=q.y-0.1; a=mix(a,vec3(0.96),(1.-smoothstep(0.11,0.135,length(vec2(ex*0.72,ey*1.45))))*0.95);
      a=mix(a,vec3(0.22,0.14,0.08),1.-smoothstep(0.062,0.078,length(vec2(ex,ey)))); a=mix(a,vec3(0.02),1.-smoothstep(0.028,0.04,length(vec2(ex,ey))));
      a*=1.-0.25*(1.-smoothstep(0.0,0.06,abs(length(vec2(ex*0.72,ey*1.45))-0.135)));
      float brow=(1.-smoothstep(0.035,0.06,abs(q.y-0.31-0.06*abs(q.x))))*step(0.16,abs(q.x))*step(abs(q.x),0.58); a=mix(a,vec3(0.14,0.1,0.08),brow*0.85);
      float mouth=(1.-smoothstep(0.02,0.045,abs(q.y+0.46)))*step(abs(q.x),0.24); a=mix(a,vec3(0.45,0.2,0.18),mouth*0.8);
      a*=1.-0.14*(1.-smoothstep(0.,0.13,length(vec2(q.x*1.7,q.y+0.14)))); } }
  else if(m==4){ rough=0.4; spec=0.4; a=mix(a,vec3(0.92),step(vL.z,-0.25)*0.0+step(0.55,abs(vL.x))*0.5); }
  else if(m==5){ vec3 q=normalize(vL),s=abs(q); float mx=max(s.x,max(s.y,s.z)),seam=min(min(abs(s.x-s.y),abs(s.y-s.z)),abs(s.x-s.z));
    vec3 pc=mx==s.x?vec3(0.94,0.93,0.9):(mx==s.y?vec3(0.10,0.27,0.66):vec3(0.88,0.17,0.12)); a=mix(vec3(0.04),pc,smoothstep(0.015,0.05,seam)); rough=0.6; spec=0.25; }
  else if(m==7){ a*=mix(0.55,1.,smoothstep(0.25,0.4,vL.y)); float far=smoothstep(12.,26.,max(abs(vW.z),abs(vW.x)-11.)); a=mix(a,vec3(dot(a,vec3(0.333))),far*0.55); o=vec4(lit(a,n,vW,0.9,0.,0.)*mix(0.12,0.03,far),1.); return; }
  o=vec4(lit(a,n,vW,rough,spec,sss),1.); }`;
const VS_STAT = `
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec3 aC; layout(location=3) in vec2 aU; layout(location=4) in float aM;
uniform mat4 uVP; uniform float uMir,uTime; uniform vec4 uNet; out vec3 vW,vN,vC; out vec2 vU; out float vM;
void main(){ vec3 p=aP; if(aM>2.5&&aM<3.5){ p.x+=aC.b*aC.g*0.025*sin(uTime*1.7+p.z*2.3+p.y*1.7); if(aC.b*uNet.x>0.){ float d=distance(p.yz,uNet.yz); p.x+=aC.b*exp(-d*d*1.1)*exp(-uNet.w*2.6)*(0.25+0.75*cos(uNet.w*15.))*0.6*aC.g; } }
  p.y*=uMir; vW=p; vN=aN*vec3(1.,uMir,1.); vC=aC; vU=aU; vM=aM; gl_Position=uVP*vec4(p,1.); }`;
const FS_STAT = `
in vec3 vW,vN,vC; in vec2 vU; in float vM; uniform sampler2D uAt,uBd; uniform float uMir; uniform vec3 uKit2[5]; out vec4 o;` + GL_LIGHT + `
void main(){ if(uMir<0.&&vW.y>0.) discard; vec3 n=normalize(vN); int m=int(vM+0.5);
  if(m==1){ vec3 t=texture(uAt,vU).rgb; o=vec4(t*t*(uMir<0.?0.07:1.9),1.); return; }
  if(m==4){ if(uMir<0.) discard; o=vec4(vC*8.,1.); return; }
  if(m==5){ vec3 t=texture(uBd,vU).rgb; o=vec4(t*t*2.4,1.); return; }
  if(m==3){ vec2 g=abs(fract(vU)-0.5); float fw=max(fwidth(vU.x),fwidth(vU.y)); float ln=smoothstep(0.44-fw,0.44+fw,max(g.x,g.y)); float a=mix(ln,0.22,clamp(fw*2.2,0.,1.)); if(a<0.06) discard; o=vec4(lit(vec3(0.86),n,vW,0.9,0.,0.),a); return; }
  if(m==2){ float t=(abs(vW.z)>1.5&&vW.y<2.0)?vW.y:vW.z; vec3 a=mix(vec3(0.85,0.07,0.08),vec3(0.95),step(0.5,fract(t*2.5))); o=vec4(lit(a,n,vW,0.4,0.5,0.),1.); return; }
  if(m==7){ vec4 t=texture(uAt,vU); if(t.a<0.45) discard; o=vec4(lit(vC,n,vW,0.8,0.,0.),1.); return; }
  if(m==9){ float t=fract(vU.y)/0.99; float mus=0.94+0.06*sin(t*19.+vU.x*6.2832)*sin(vU.x*12.566); o=vec4(lit(vC*mus,n,vW,0.42,0.3,1.),1.); return; }
  if(m==10){ int kit=int(vU.y); float t=fract(vU.y)/0.99; vec3 a=vC; float side=smoothstep(0.90,0.95,abs(sin(vU.x*6.2832))); a=mix(a,uKit2[kit],side*step(t,0.80)); a=mix(a,uKit2[kit],smoothstep(0.795,0.81,t));
    float f=sin(t*70.+sin(vU.x*25.)*2.5)*0.5+0.5; a*=0.9+0.1*f; o=vec4(lit(a,n,vW,0.85,0.06,0.),1.); return; }
  if(m==11){ float f=sin(vU.y*90.+sin(vU.x*31.)*2.)*0.5+0.5; o=vec4(lit(vC*(0.9+0.1*f),n,vW,0.8,0.08,0.),1.); return; }
  if(m==13){ vec3 t=texture(uAt,vU).rgb; o=vec4(lit(t*t,n,vW,0.8,0.,0.),1.); return; }
  if(m==12){ float e=1.-abs(vU.x-0.5)*2.; o=vec4(vC,0.07*e*e*e*smoothstep(0.,0.35,1.-vU.y)*(0.3+0.7*(1.-vU.y))); return; }
  if(m==8){ float r=length(vU-0.5)*2.,a=smoothstep(0.70,0.80,r)*(1.-smoothstep(0.90,1.,r)); if(a<0.04) discard; o=vec4(vC*1.6,a); return; }
  float far=smoothstep(12.,26.,max(abs(vW.z),abs(vW.x)-11.)); o=vec4(lit(vC,n,vW,0.7,0.15,0.)*mix(1.,0.09,far),1.); }`;
const VS_FLOOR = `layout(location=0) in vec3 aP; uniform mat4 uVP; out vec3 vW; void main(){ vW=aP; gl_Position=uVP*vec4(aP,1.); }`;
const FS_FLOOR = `
in vec3 vW; uniform sampler2D uAt; uniform vec4 uBlob[33]; out vec4 o;` + GL_LIGHT + `
float ln(float d,float w,float aa){ return 1.-smoothstep(w-aa,w+aa,abs(d)); }
void main(){ vec2 p=vW.xz; float aa=max((fwidth(p.x)+fwidth(p.y))*0.6,0.004);
  float u=20.-abs(p.x),dz=max(abs(p.y)-1.5,0.),d=dz>0.?length(vec2(u,dz)):u; bool inC=abs(p.x)<=20.&&abs(p.y)<=10.;
  vec3 col=vec3(0.035,0.055,0.08); vec3 zone=vec3(0.78,0.40,0.11);
  if(inC){ col=vec3(0.03,0.26,0.29)*(0.965+0.035*step(0.5,fract(p.x/2.))); if(d<6.) col=zone; if(length(p)<2.) col=mix(col,zone,0.9);
    vec2 q=vec2(abs(p.x)-6.4,abs(p.y)-6.3);
    if(abs(q.x)<3.&&abs(q.y)<0.8){ float em=smoothstep(0.,aa*2.,3.-abs(q.x))*smoothstep(0.,aa*2.,0.8-abs(q.y)); float row=(p.x>0.?0.:1.)+(p.y>0.?0.:2.); float cx=p.x>0.?6.4:-6.4, cz=p.y>0.?6.3:-6.3;
      vec2 uv=vec2((p.x-(cx-3.))/6.*0.25,(row*100.+3.+94.*(p.y-(cz-0.8))/1.6)/1024.); vec3 t=texture(uAt,uv).rgb; col=mix(col,t*t,0.9*em); } }
  float L=0.;
  if(abs(p.x)<=20.03&&abs(p.y)<=10.03){
    L=max(L,ln(abs(p.y)-9.975,0.025,aa)); L=max(L,ln(abs(p.x)-19.975,abs(p.y)<1.5?0.04:0.025,aa)); L=max(L,ln(p.x,0.025,aa));
    L=max(L,ln(d-5.975,0.025,aa));
    float s=abs(p.y)<=1.5?p.y:sign(p.y)*(1.5+9.*atan(abs(p.y)-1.5,max(u,0.001)));
    L=max(L,ln(d-8.975,0.025,aa)*step(0.5,fract(s/0.30))*step(abs(p.y),9.95));
    L=max(L,ln(u-6.975,0.025,aa)*step(abs(p.y),0.5)); L=max(L,ln(u-3.975,0.025,aa)*step(abs(p.y),0.075)); L=max(L,ln(length(p)-1.975,0.025,aa)); }
  col=mix(col,vec3(0.94),L);
  float sh=shadow(vW),blob=1.; for(int i=0;i<33;i++){ vec2 e=p-uBlob[i].xy; blob*=1.-uBlob[i].w*exp(-dot(e,e)/(uBlob[i].z*uBlob[i].z)); }
  vec3 v=normalize(uCam-vW); float fr=pow(1.-max(v.y,0.),4.);
  vec3 lc=col*(0.26+0.80*sh)*blob;
  vec3 r=reflect(-v,vec3(0.,1.,0.)); vec2 h=vW.xz+r.xz*(15.2/max(r.y,0.05)); vec2 g=vec2(abs(fract(h.x/8.+0.5)-0.5)*8.,abs(fract(h.y/7.5+0.5)-0.5)*7.5);
  float pan=(1.-smoothstep(0.2,3.4,g.x))*(1.-smoothstep(0.0,2.2,g.y))*step(abs(h.x),27.)*step(abs(h.y),18.);
  lc+=pan*vec3(1.,0.97,0.9)*(0.0+0.05*fr);
  float refl=(0.012+0.08*fr)*(inC?1.:0.5); o=vec4(lc,1.-refl); }`;
const VS_POST = `out vec2 vU; void main(){ vec2 p=vec2(float(gl_VertexID&1),float(gl_VertexID>>1))*4.-1.; vU=p*0.5+0.5; gl_Position=vec4(p,0.,1.); }`;
const FS_POST = `
in vec2 vU; uniform sampler2D uT,uB; uniform float uTime; out vec4 o;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }
void main(){ vec3 c=texture(uT,vU).rgb; vec3 b=vec3(0.); for(int l=0;l<5;l++) b+=max(textureLod(uB,vU,float(l)).rgb-0.8,0.); c+=b*0.14;
  vec2 q=vU-0.5; c*=1.-dot(q,q)*0.55; c=aces(c*0.92); c=pow(c,vec3(1./2.2));
  c+=(fract(sin(dot(gl_FragCoord.xy+uTime,vec2(12.9898,78.233)))*43758.5453)-0.5)/255.; o=vec4(c,1.); }`;

const R = { cam: { x: 0, y: 11, z: 24, tx: 0, ty: 1, tz: 0, fov: 0.56 }, w: 0, h: 0, scale: 1, msaa: 4, _msaa: 0, beams: false, time: 0, gpuMs: 0 };
const crowd = [], CROWD_C = [0, -20, -30, 0, 0, 20, 30, 0]; let ballB = null, beams = null, blTex = null, blFbo = null, pShadowS, pInst, pStat, pFloor, pPost, pShadow, capB, sphB, arena, atlasT, boardT, boardCv, boardG, floorVao, decals, decN = 0, shFbo, shTex, msFbo, rsFbo, rsTex, msCol, msDep;
const mVP = m4(), mV = m4(), mPr = m4(), mLVP = m4(), blobs = new Float32Array(33 * 4);
function initRender() {
  pInst = mkProg(VS_INST, FS_INST); pStat = mkProg(VS_STAT, FS_STAT); pFloor = mkProg(VS_FLOOR, FS_FLOOR); pPost = mkProg(VS_POST, FS_POST);
  pShadowS = mkProg(VS_STAT, 'in vec3 vW,vN,vC; in vec2 vU; in float vM; out vec4 o; void main(){ o=vec4(1.); }'); initBody();
  pShadow = mkProg(VS_INST, 'in vec3 vW,vN,vL; in vec4 vC,vQ; out vec4 o; void main(){ o=vec4(1.); }');
  const cap = capsuleMesh(12, 8), sph = sphereMesh(14, 10); ballB = mkInst(sphereMesh(28, 18), 2, true); // seul le ballon garde un maillage fin
  capB = mkInst(cap, 16 * 40 + 8, true); sphB = mkInst(sph, 16 * 20 + 8, true);
  { const cm = capsuleMesh(8, 4, 0.1, [0, 0.1, 0.55, 0.9, 1]), sm = sphereMesh(8, 5); /* buste à flancs droits et épaules arrondies, plus de silhouette en losange */ for (let i = 0; i < 4; i++) crowd.push({ c: mkInst(cm, i & 1 ? 5200 : 11000, false), s: mkInst(sm, i & 1 ? 1800 : 3600, false) }); }
  atlasT = buildAtlas(); arena = buildArena(crowd); beams = buildBeams(); for (const k of crowd) { upInst(k.c); upInst(k.s); }
  boardCv = document.createElement('canvas'); boardCv.width = 512; boardCv.height = 256; boardG = boardCv.getContext('2d'); boardT = mkTex(boardCv, false);
  floorVao = gl.createVertexArray(); gl.bindVertexArray(floorVao); const fb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, fb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-37, 0, -27.6, 37, 0, -27.6, 37, 0, 27.6, -37, 0, -27.6, 37, 0, 27.6, -37, 0, 27.6]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  decals = mkStatic(new Float32Array(200 * 6 * SSTR), true);
  shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, shTex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, 2048, 2048);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  shFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, shFbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shTex, 0); gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  const lv = m4(), lp = m4(); m4look(lv, 0.22 * 30, 30, 0.18 * 30, 0, 0, 0, 0, 0, -1); m4ortho(lp, -24, 24, -14, 14, 5, 60); m4mul(mLVP, lp, lv);
  msFbo = gl.createFramebuffer(); rsFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function resizeRender() {
  const dpr = min(window.devicePixelRatio || 1, 2) * R.scale, w = max(2, Math.round(canvas.clientWidth * dpr)), h = max(2, Math.round(canvas.clientHeight * dpr));
  if (w === R.w && h === R.h && R.msaa === R._msaa) return; R._msaa = R.msaa; R.w = canvas.width = w; R.h = canvas.height = h;
  const fmt = HDR ? gl.RGBA16F : gl.RGBA8, smp = min(R.msaa, gl.getParameter(gl.MAX_SAMPLES));
  if (msCol) { gl.deleteRenderbuffer(msCol); gl.deleteRenderbuffer(msDep); gl.deleteTexture(rsTex); }
  msCol = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, msCol); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, smp, fmt, w, h);
  msDep = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, msDep); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, smp, gl.DEPTH_COMPONENT24, w, h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msCol); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msDep);
  rsTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, rsTex); gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, rsFbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rsTex, 0);
  // halo : copie au quart de la résolution, seule à recevoir des niveaux de mip
  if (blTex) gl.deleteTexture(blTex); R.bw = max(2, w >> 2); R.bh = max(2, h >> 2); blTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, blTex); gl.texStorage2D(gl.TEXTURE_2D, Math.floor(Math.log2(max(R.bw, R.bh))) + 1, fmt, R.bw, R.bh);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (!blFbo) blFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, blFbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, blTex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
let _bScore = '';
function updateBoard() {
  const mm = Math.floor(S.clock / 60), ss = Math.floor(S.clock % 60), key = S.score[0] + '-' + S.score[1] + '-' + mm + ':' + ss + S.half; if (key === _bScore) return; _bScore = key;
  const g = boardG; g.fillStyle = '#05080c'; g.fillRect(0, 0, 512, 256); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 30px system-ui,sans-serif'; g.fillStyle = '#e8eef2'; g.fillText('HÉRONS', 110, 44); g.fillText('ATLAS', 402, 44);
  g.font = '900 130px system-ui,sans-serif'; g.fillStyle = '#ffd24a'; g.fillText(String(S.score[0]), 110, 150); g.fillText(String(S.score[1]), 402, 150);
  g.font = '800 52px ui-monospace,monospace'; g.fillStyle = '#ff5a3d'; g.fillText(String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0'), 256, 120); g.font = '700 22px system-ui,sans-serif'; g.fillStyle = '#9fb3c2'; g.fillText(S.half ? '2e mi-temps' : '1re mi-temps', 256, 180);
  gl.bindTexture(gl.TEXTURE_2D, boardT); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, boardCv);
}

// ---------- joueurs
const SKIN = [[0.74, 0.55, 0.43], [0.66, 0.47, 0.35], [0.5, 0.34, 0.24], [0.34, 0.22, 0.15], [0.78, 0.6, 0.48]];
const HAIR = [[0.08, 0.06, 0.05], [0.25, 0.15, 0.08], [0.55, 0.42, 0.22], [0.12, 0.11, 0.12], [0.4, 0.2, 0.1]];
// [maillot, second ton, short, chaussettes, chaussures, numéro]
const KIT = [
  [[0.92, 0.93, 0.95], [0.03, 0.44, 0.50], [0.03, 0.30, 0.36], [0.92, 0.93, 0.95], [0.95, 0.45, 0.1], [0.01, 0.16, 0.2]],
  [[0.70, 0.07, 0.11], [0.06, 0.06, 0.08], [0.06, 0.06, 0.08], [0.70, 0.07, 0.11], [0.9, 0.9, 0.92], [0.95, 0.95, 0.95]],
  [[0.72, 0.84, 0.12], [0.08, 0.1, 0.1], [0.07, 0.08, 0.09], [0.07, 0.08, 0.09], [0.2, 0.8, 0.9], [0.07, 0.08, 0.09]],
  [[0.42, 0.24, 0.72], [0.9, 0.9, 0.95], [0.08, 0.07, 0.12], [0.08, 0.07, 0.12], [0.95, 0.85, 0.2], [0.95, 0.95, 0.95]],
  [[0.09, 0.09, 0.1], [0.3, 0.3, 0.33], [0.05, 0.05, 0.06], [0.05, 0.05, 0.06], [0.1, 0.1, 0.1], [0.9, 0.9, 0.2]],
];
let _dv = null;
function decQuad(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, col, u0, v0, u1, v1, mat) {
  if (decN >= 200) return; const d = _dv, P = _dqp; P[0] = ax; P[1] = ay; P[2] = az; P[3] = bx; P[4] = by; P[5] = bz; P[6] = cx; P[7] = cy; P[8] = cz; P[9] = dx; P[10] = dy; P[11] = dz;
  for (let i = 0; i < 6; i++) { const k = _dqi[i], o = (decN * 6 + i) * SSTR; d[o] = P[k * 3]; d[o + 1] = P[k * 3 + 1]; d[o + 2] = P[k * 3 + 2]; d[o + 3] = 0; d[o + 4] = 1; d[o + 5] = 0; d[o + 6] = col[0]; d[o + 7] = col[1]; d[o + 8] = col[2]; d[o + 9] = k === 0 || k === 3 ? u0 : u1; d[o + 10] = k < 2 ? v1 : v0; d[o + 11] = mat; }
  decN++;
}
const _dqp = new Float32Array(12), _dqi = [0, 1, 2, 0, 2, 3];
const C_HOLD = [0.9, 0.9, 0.9], C_RING = [1, 0.8, 0.15], C_NEXT = [0.2, 0.85, 1], C_AIM = [1, 0.3, 0.15];
function ring(x, z, r, col) { decQuad(x - r, 0.025, z + r, x + r, 0.025, z + r, x + r, 0.025, z - r, x - r, 0.025, z - r, col, 0, 0, 1, 1, M_RING); }
function buildDyn() {
  capB.n = 0; sphB.n = 0; ballB.n = 0; decN = 0; bodyN = 0; _dv = decals.data; const b = S.ball;
  for (let i = 0; i < 16; i++) { const p = S.P[i]; pushPlayer(p); for (let f = 0; f < 2; f++) { const a = (f ? ANR : ANL) * 3, t = (f ? TOR : TOL) * 3, o = (i * 2 + f) * 4; blobs[o] = (p.J[a] + p.J[t]) / 2; blobs[o + 1] = (p.J[a + 2] + p.J[t + 2]) / 2; blobs[o + 2] = 0.17; blobs[o + 3] = 0.75 * sat(1 - (p.J[a + 1] - 0.075) / 0.25); } }
  let vx = b.vx, vz = b.vz; if (hyp(vx, vz) < 0.2) { vx = 1; vz = 0; } const a = b.rot, vl = hyp(vx, vz); // rotation autour de l'axe perpendiculaire à la course
  const ca = cos(a), sa = sin(a);
  sphI(ballB, b.x, b.y, b.z, BALL_R, BALL_R, BALL_R, -vx / vl * sa, ca, -vz / vl * sa, vx / vl * ca, sa, vz / vl * ca, 1, 1, 1, 5, 0, 0, 0);
  blobs[128] = b.x; blobs[129] = b.z; blobs[130] = 0.13 + b.y * 0.08; blobs[131] = 0.55 / (1 + b.y * 1.5);
  if (b.state === B_HELD && (S.auto || S.ctl !== b.holder)) { const p = S.P[b.holder]; ring(p.x, p.z, 0.5, C_HOLD); }
  if (!S.auto && S.ctl >= 0 && S.phase !== 'menu') { const p = S.P[S.ctl]; ring(p.x, p.z, 0.62, C_RING); const tm = S.tm[0]; if (tm.combo && tm.next >= 0 && !S.P[tm.next].off) ring(S.P[tm.next].x, S.P[tm.next].z, 0.55, C_NEXT);
    if (S.charging) { const dir = S.dir[0], sd = p.z > 0.4 ? 1 : p.z < -0.4 ? -1 : (p.lefty ? 1 : -1) * dir, z = -sd * clamp(S.inp.aimH, -1, 1) * 1.25, y = 0.2 + sat(S.inp.aimV) * 1.55, x = dir * (HALF_L - 0.12), r = 0.22; decQuad(x, y - r, z - r, x, y - r, z + r, x, y + r, z + r, x, y + r, z - r, C_AIM, 0, 0, 1, 1, M_RING); } }
  upInst(capB); upInst(sphB); upInst(ballB); upBody();
  gl.bindBuffer(gl.ARRAY_BUFFER, decals.vb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, decals.data, 0, decN * 6 * SSTR);
}
function setCommon(P, mir) {
  gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.uVP, false, mVP); if (P.u.uMir) gl.uniform1f(P.u.uMir, mir); if (P.u.uCam) gl.uniform3f(P.u.uCam, R.cam.x, R.cam.y, R.cam.z);
  if (P.u.uLVP) gl.uniformMatrix4fv(P.u.uLVP, false, mLVP); if (P.u.uSh) gl.uniform1i(P.u.uSh, 2); if (P.u.uAt) gl.uniform1i(P.u.uAt, 0); if (P.u.uBd) gl.uniform1i(P.u.uBd, 1);
  if (P.u.uTime) gl.uniform1f(P.u.uTime, R.time); if (P.u.uCheer) gl.uniform1f(P.u.uCheer, 0.12 + S.cheer);
  if (P.u.uKit2) gl.uniform3fv(P.u.uKit2, KIT2);
  if (P.u.uNet) gl.uniform4f(P.u.uNet, S.netS, S.netY, S.netZ, max(0, S.t - S.netT));
}
function renderFrame() {
  resizeRender(); R.time += 1 / 60; updateBoard(); buildDyn();
  const c = R.cam; m4persp(mPr, c.fov, R.w / R.h, 0.3, 160); m4look(mV, c.x, c.y, c.z, c.tx, c.ty, c.tz, 0, 1, 0); m4mul(mVP, mPr, mV);
  gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
  // ombres
  gl.bindFramebuffer(gl.FRAMEBUFFER, shFbo); gl.viewport(0, 0, 2048, 2048); gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(pShadow.p); gl.uniformMatrix4fv(pShadow.u.uVP, false, mLVP); gl.uniform1f(pShadow.u.uMir, 1); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4); drawInst(capB); drawInst(sphB); drawInst(ballB); gl.useProgram(pShadowS.p); gl.uniformMatrix4fv(pShadowS.u.uVP, false, mLVP); gl.uniform1f(pShadowS.u.uMir, 1); gl.uniform4f(pShadowS.u.uNet, 0, 0, 0, 9); drawBody(); gl.disable(gl.POLYGON_OFFSET_FILL);
  // scène
  gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo); gl.viewport(0, 0, R.w, R.h); gl.clearColor(0.01, 0.012, 0.016, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasT); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, boardT); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, shTex);
  setCommon(pStat, -1); gl.bindVertexArray(arena.vao); gl.drawArrays(gl.TRIANGLES, 0, arena.n); drawBody();
  setCommon(pInst, -1); drawInst(capB); drawInst(sphB); drawInst(ballB);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  setCommon(pFloor, 1); gl.uniform4fv(pFloor.u.uBlob, blobs); gl.bindVertexArray(floorVao); gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.disable(gl.BLEND);
  gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE); setCommon(pStat, 1); gl.bindVertexArray(arena.vao); gl.drawArrays(gl.TRIANGLES, 0, arena.n); gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE); drawBody();
  setCommon(pInst, 1); if (!R.noCrowd) { let vx = c.tx - c.x, vy = c.ty - c.y, vz = c.tz - c.z; const vl = 1 / hyp(vx, vy, vz); vx *= vl; vy *= vl; vz *= vl;
    for (let i = 0; i < 4; i++) { const sx = CROWD_C[i * 2], sz = CROWD_C[i * 2 + 1]; if ((sx - c.x) * vx + (5 - c.y) * vy + (sz - c.z) * vz < -4) continue; drawInst(crowd[i].c); drawInst(crowd[i].s); } } /* les tribunes derrière la caméra ne sont pas dessinées */ drawInst(capB); drawInst(sphB); drawInst(ballB);
  gl.enable(gl.BLEND); setCommon(pStat, 1); gl.bindVertexArray(decals.vao); gl.drawArrays(gl.TRIANGLES, 0, decN * 6);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false); gl.bindVertexArray(beams.vao); if (R.beams) gl.drawArrays(gl.TRIANGLES, 0, beams.n); /* faisceaux désactivés : jugés trop durs par les critiques */ gl.depthMask(true); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.BLEND);
  // résolution et post-traitement
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, rsFbo); gl.blitFramebuffer(0, 0, R.w, R.h, 0, 0, R.w, R.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.disable(gl.DEPTH_TEST);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, rsFbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, blFbo); gl.blitFramebuffer(0, 0, R.w, R.h, 0, 0, R.bw, R.bh, gl.COLOR_BUFFER_BIT, gl.LINEAR); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, R.w, R.h);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, blTex); gl.generateMipmap(gl.TEXTURE_2D); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rsTex);
  gl.useProgram(pPost.p); gl.uniform1i(pPost.u.uT, 0); gl.uniform1i(pPost.u.uB, 1); gl.uniform1f(pPost.u.uTime, R.time); gl.bindVertexArray(floorVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
}
