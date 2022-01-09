function t(t,n){const o=t.getBoundingClientRect();let i=o.width,r=o.height,s=0,l=0,c=256,a=0,u=0,h=0,A=1/0;this.getLon=()=>s,this.getLat=()=>l,this.getZoom=()=>c,this.getProjConv=()=>n,this.getShift=()=>[a,u],this.getViewBoxShift=()=>[a-i/2,u-r/2],this.getViewBoxSize=()=>[i,r],this.getZoomRange=()=>[h,A],this.setZoomRange=(t,e)=>{h=t,A=e};const f=document.createElement("canvas");f.className="locmap-canvas",f.style.position="absolute",f.style.left="0",f.style.top="0",f.style.width="100%",f.style.height="100%",t.appendChild(f);const m=f.getContext("2d");function g(){s=n.x2lon(a,c),l=n.y2lat(u,c)}function d(){a=n.lon2x(s,c),u=n.lat2y(l,c)}this.getWrap=()=>t,this.getCanvas=()=>f,this.get2dContext=()=>m,this.lon2x=t=>n.lon2x(t,c),this.lat2y=t=>n.lat2y(t,c),this.meters2pixCoef=t=>n.meters2pixCoef(t,c),this.x2lon=t=>n.x2lon(t,c),this.y2lat=t=>n.y2lat(t,c);const p=[];this.register=t=>{if(p.includes(t))throw new Error("already registered");p.push(t),t.register&&t.register(this)},this.unregister=t=>{const e=p.indexOf(t);if(-1===e)throw new Error("not registered yet");p.splice(e,1),t.unregister&&t.unregister(this)},this.updateLocation=(t,e,n)=>{s=t,l=e,c=n,d(),w(),L()};const w=()=>{for(let t=0;t<p.length;t++){const e=p[t];e.update&&e.update(this)}},v=()=>{if(null!==m){m.clearRect(0,0,f.width,f.height),m.scale(devicePixelRatio,devicePixelRatio);for(let t=0;t<p.length;t++){const e=p[t];e.redraw&&e.redraw(this)}m.scale(1/devicePixelRatio,1/devicePixelRatio)}},x=1e-4;let y=0,E=0,b=0,M=0,S=1;let B=0,R=0,I=0,z=0;const C=t=>{const e=performance.now();if(Math.abs(S-1)>x){const t=e-E;let n;if(1===y){n=S**t;S=1+(S-1)*.993**t}else{let e=1+(S-1)*.983**t;Math.abs(e-1)<=x&&(e=1),n=S/e,S=e}this.zoom(b,M,n),E=e}if(I**2+z**2>1e-4){const t=e-R;let n,o;if(1===B){n=I*t,o=z*t;const e=.993**t;I*=e,z*=e}else{let e=.985**t;(I*e)**2+(z*e)**2<1e-4&&(e=0),n=I*(1-e),o=z*(1-e),I*=e,z*=e}this.move(n,o),R=e}};let D=!1;function L(){D||(D=!0,requestAnimationFrame(X))}function X(t){D=!1,C(),v()}this.requestRedraw=L,this.resize=()=>{const e=t.getBoundingClientRect();f.width=e.width*devicePixelRatio,f.height=e.height*devicePixelRatio,i=e.width,r=e.height,L()},this.zoom=(t,n,o)=>{const s=c;c=e(h,A,c,o);const l=c/s;a+=(i/2-t-a)*(1-l),u+=(r/2-n-u)*(1-l),g(),w(),L(),this.emit("mapZoom",{x:t,y:n,delta:o})},this.zoomSmooth=(t,n,o,i)=>{0!==y&&(S=1),S=e(h/c,A/c,S,o),b=t,M=n,E=i,y=0,C()},this.move=(t,e)=>{a-=t,u-=e,g(),w(),L(),this.emit("mapMove",{dx:t,dy:e})},this.moveSmooth=(t,e,n)=>{0!==B&&(I=z=0),I+=t,z+=e,R=n,B=0,C()},this.applyMoveInertia=(t,e,n)=>{I=t,z=e,R=n,B=1,C()},this.applyZoomInertia=(t,e,n,o)=>{S=n,b=t,M=e,E=o,y=1,C()},this.emit=(t,e)=>{for(let n=0;n<p.length;n++){const o=p[n],i=o.onEvent&&o.onEvent[t];i&&i(this,e)}},d()}function e(t,e,n,o){return n*=o,o<1&&n<t&&(n=t),o>1&&n>e&&(n=e),n}function n(t){let e,n,c,a,u,h,A,f,m,g,d,p,w,v;const{singleDown:x=o,singleMove:y=o,singleUp:E=o}=t,{doubleDown:b=o,doubleMove:M=o,doubleUp:S=o}=t,{singleHover:B=o,singleLeave:R=o,wheelRot:I=o}=t,z=[],C=function(t){function e(e){return n=>{let o=0,i=0;const r=t();r&&({left:o,top:i}=r.getBoundingClientRect()),e(n,-o,-i)&&n.preventDefault()}}return e}((()=>a)),D=C((function(t,e,n){return 0===t.button&&(s(h),s(A),l(m),x(t,"mouse",t.clientX+e,t.clientY+n,!1))})),L=C((function(t,e,n){return y(t,"mouse",t.clientX+e,t.clientY+n)})),X=C((function(t,e,n){return 0===t.button&&(l(h),l(A),s(m),E(t,"mouse",!1))})),Z=C((function(t,e,n){return B(t,t.clientX+e,t.clientY+n)})),Y=C((function(t,e,n){return R(t,t.clientX+e,t.clientY+n)})),T=C((function(t,e,n){const o=z.length;if(2===o)return!1;const i=t.changedTouches;if(0===o&&(s(p),s(w),s(v)),0===o&&1===i.length){const o=t.changedTouches[0];return z.push(o.identifier),x(t,z[0],o.clientX+e,o.clientY+n,!1)}let l,c,a=!1;0===o?(l=i[0],c=i[1],z.push(l.identifier),a=x(t,l.identifier,l.clientX+e,l.clientY+n,!1)):(l=r(t.touches,z[0]),c=t.changedTouches[0]),z.push(c.identifier);const u=E(t,l.identifier,!0);a=a||u;const h=l.clientX+e,A=l.clientY+n,f=c.clientX+e,m=c.clientY+n,g=b(t,z[0],h,A,z[1],f,m);return a||g})),k=C((function(t,e,n){const o=z.length;if(1===o){const o=i(t.changedTouches,z[0]);return null!==o&&y(t,z[0],o.clientX+e,o.clientY+n)}if(2===o){const o=r(t.touches,z[0]),i=r(t.touches,z[1]),s=o.clientX+e,l=o.clientY+n,c=i.clientX+e,a=i.clientY+n;return M(t,z[0],s,l,z[1],c,a)}})),W=[],$=C((function(t,e,n){const o=z.length;if(0===o)return!1;const i=z[0],s=z[1];W.length=0;for(let e=z.length-1;e>=0;e--)for(let n=0;n<t.changedTouches.length;n++){const o=t.changedTouches[n];if(o.identifier===z[e]){z.splice(e,1),W.push(o);break}}if(0===W.length)return!1;if(o===W.length&&(l(p),l(w),l(v)),1===o)return E(t,W[0].identifier,!1);const c=1===W.length?r(t.touches,z[0]):W[1],a=S(t,i,s),u=x(t,c.identifier,c.clientX+e,c.clientY+n,!0);let h=!1;return 2===o&&2===W.length&&(h=E(t,c.identifier,!1)),a||u||h})),P=C((function(t,e,n){$(t)})),j=function(t,e){const n=[];return n[WheelEvent.DOM_DELTA_PIXEL]=1,n[WheelEvent.DOM_DELTA_LINE]=20,n[WheelEvent.DOM_DELTA_PAGE]=50,t((function(t,o,i){const r=n[t.deltaMode];return e(t,t.deltaX*r,t.deltaY*r,t.deltaZ*r,t.clientX+o,t.clientY+i)}))}(C,I);return function(t){let e=null;return{get isOn(){return!!e},on(n){if(!e){e=t(n);e[1].map(s)}return this},off(){if(e){e[0].map(l),e=null}return this}}}((t=>{var o,i;e=t.startElem,n=t.moveElem??window,c=t.leaveElem??e,o=t.offsetElem,i=e,a="no-offset"===o?null:o??i,u=[e,"mousedown",D],h=[n,"mousemove",L],A=[n,"mouseup",X],f=[e,"wheel",j],m=[n,"mousemove",Z],g=[c,"mouseleave",Y],d=[e,"touchstart",T],p=[n,"touchmove",k],w=[n,"touchend",$],v=[n,"touchcancel",P];return[[u,h,A,m,g,f,d,p,w,v],[u,d,m,g,f]]}))}function o(){}function i(t,e){for(let n=0;n<t.length;n++)if(t[n].identifier===e)return t[n];return null}function r(t,e){const n=i(t,e);if(null===n)throw new Error(`touch #${e} not found`);return n}function s(t){t[0].addEventListener(t[1],t[2],{capture:!0,passive:!1})}function l(t){t[0].removeEventListener(t[1],t[2],{capture:!0})}function c(t,e,n,o){return Math.sqrt((n-t)*(n-t)+(o-e)*(o-e))}function a(t,e,n){let o=0,i=0,r=0,s=0,l=0;const c=t.length,a=performance.now(),u=t[c-1];let h=u;for(let n=c-1;n>0;n--){const c=t[n-1];if(a-c.stamp>150)break;const u=h.stamp-c.stamp,A=h[e]-c[e];if(0===u)continue;const f=h.stamp,m=A/u;o+=f,i+=m,r+=f*f,s+=f*m,l++,h=c}if(1===l){const t=u.stamp-h.stamp,n=u[e]-h[e];return t<4?0:n/t}if(0===l)return 0;const A=l*r-o*o;if(0===A)return 0;const f=(l*s-o*i)/A;let m=f*n+(i-f*o)/l;return m*(u[e]-h[e])<0&&(m=0),m}function u(t){const{doNotInterfere:e}=t||{};let o,i=0,r=0,s=0,l=0,u=null,h=0,A=0,f=0,m=0,g=1,d=0,p=[{x:0,y:0,stamp:0}],w=[{dist:0,stamp:0}];for(const t of[p,w])for(;t.length<5;)t.push(Object.assign({},t[0]));function v(t,e){const n=t[t.length-1];if(n.stamp===e)return n;const o=t.shift();return t.push(o),o}function x(t){const e=v(p,t);e.x=i,e.y=r,e.stamp=t}function y(){const t=p[p.length-1],e=i-t.x,n=r-t.y;for(let t=0;t<p.length;t++)p[t].x+=e,p[t].y+=n}function E(t,e,n){const o=n-d,s=function(t,e,n){return Math.max(t,Math.min(e,n))}(0,1,(150-o)/150*2);i=(h+f*o)*s+t*(1-s),r=(A+m*o)*s+e*(1-s)}function b(t,n){return e&&"mouse"!==n&&t.timeStamp-d>1e3}const M=t=>n({singleDown:(e,n,o,i,r)=>!b(e,n)&&(t.getWrap().focus(),E(o,i,e.timeStamp),r&&y(),r||(x(e.timeStamp),t.applyMoveInertia(0,0,0),t.applyZoomInertia(0,0,1,0),s=0,u=null),t.emit("singleDown",{x:o,y:i,id:n,isSwitching:r}),!0),singleMove(e,n,o,l){if(b(e,n))return t.emit("controlHint",{type:"use_two_fingers"}),!1;const a=i,u=r;return E(o,l,e.timeStamp),s+=c(a,u,i,r),t.move(i-a,r-u),x(e.timeStamp),t.emit("singleMove",{x:o,y:l,id:n}),!0},singleUp(e,n,o){const c=e.timeStamp;if(o||function(t,e){const n=a(p,"x",e),o=a(p,"y",e),s=a(w,"dist",e)/g+1;t.applyMoveInertia(n,o,p[p.length-1].stamp),t.applyZoomInertia(i,r,s,w[w.length-1].stamp)}(t,c),t.emit("singleUp",{x:i,y:r,id:n,isSwitching:o}),s<5&&!o)if(u){t.zoomSmooth(i,r,.5,c);const[e,n,o,s,l,a]=u;t.emit("doubleClick",{id0:e,x0:n,y0:o,id1:s,x1:l,y1:a})}else{const e=l>c-500;l=c,e&&t.zoomSmooth(i,r,2,c),t.emit(e?"dblClick":"singleClick",{x:i,y:r,id:n})}return!0},doubleDown:(e,n,o,s,l,a,f)=>(i=.5*(o+a),r=.5*(s+f),g=c(o,s,a,f),h=i,A=r,y(),u=[n,o,s,l,a,f],t.emit("doubleDown",{id0:n,x0:o,y0:s,id1:l,x1:a,y1:f}),!0),doubleMove(e,n,o,l,a,f,m){const d=.5*(o+f),y=.5*(l+m),E=c(o,l,f,m);var b,M,S,B;return b=d,M=y,S=E,B=e.timeStamp,(i!==b||r!==M||g!==S||p[p.length-1].stamp!==B)&&(t.move(d-i,y-r),t.zoom(d,y,E/g),s+=c(i,r,d,y)+Math.abs(E-g),u=[n,o,l,a,f,m],i=d,r=y,g=E,h=d,A=y,x(e.timeStamp),function(t){const e=v(w,t);e.dist=g,e.stamp=t}(e.timeStamp),t.emit("doubleMove",{id0:n,x0:o,y0:l,id1:a,x1:f,y1:m})),!0},doubleUp(e,n,o){const i=e.timeStamp;return f=a(p,"x",i),m=a(p,"y",i),d=e.timeStamp,t.emit("doubleUp",{id0:n,id1:o}),!0},wheelRot:(n,o,i,r,s,l)=>!e||n.ctrlKey||n.metaKey?(t.zoomSmooth(s,l,Math.pow(2,-i/240),n.timeStamp),!0):(t.emit("controlHint",{type:"use_control_to_zoom"}),!1),singleHover(e,n,o){t.emit("singleHover",{x:n,y:o})}}).on({startElem:t.getCanvas()});this.register=t=>{o=M(t)},this.unregister=t=>{o.off()}}function h(t){const{outlineFix:e="none"}=t||{};let n,o=-1;this.register=t=>{const i=t.getWrap();o=i.tabIndex,i.tabIndex=1,null!==e&&(i.style.outline=e),n=(t=>e=>{if(e.ctrlKey||e.altKey)return;let n=!0;const{key:o,shiftKey:i,timeStamp:r}=e,{width:s,height:l}=t.getCanvas(),c=75*(i?3:1),a=2*(i?2:1);"ArrowUp"===o?t.moveSmooth(0,c,r):"ArrowDown"===o?t.moveSmooth(0,-c,r):"ArrowLeft"===o?t.moveSmooth(c,0,r):"ArrowRight"===o?t.moveSmooth(-c,0,r):"="===o||"+"===o?t.zoomSmooth(s/2,l/2,a,r):"-"===o||"_"===o?t.zoomSmooth(s/2,l/2,1/a,r):n=!1,n&&e.preventDefault()})(t),i.addEventListener("keydown",n)},this.unregister=t=>{const e=t.getWrap();e.tabIndex=o,e.removeEventListener("keydown",n)}}function A(t,e){const n=[new u(t),new h(e)];this.register=t=>{for(const e of n)e.register(t)},this.unregister=t=>{for(const e of n)e.unregister(t)}}function f(t,e,n){const o=new Map;let i=new Set;const r=[];let s=[0,0,0,0,0],l=0;function c(t,n,i,r,s){const c=`${n}|${i}|${r}`;let a=o.get(c);return!a&&s&&(a=function(t,n,o,i){const r={img:null,clear:null,x:n,y:o,z:i,appearAt:0,lastDrawIter:l};return e(n,o,i,((e,n)=>{r.img=e,r.clear=n,t.requestRedraw()})),r}(t,n,i,r),o.set(c,a)),a}function a(t,e,n,o,i){const r=c(t,e,n,o,!1);return!!r&&!!r.img&&h(r)&&(!i||u(r)>=1)}function u(t){return(performance.now()-t.appearAt)/150}function h(t){return t.lastDrawIter>=l-1}function A(t,e,n,o,r,c,a,A,f,m,g){const d=t.get2dContext();if(!d)return;h(e)||(!function(t){const[e,n,o,i,r]=s,{x:l,y:c,z:a}=t;return a===r&&(l<e||l>=e+o||c<n||c>=n+i)}(e)?e.appearAt=performance.now()-16:e.appearAt=0),e.lastDrawIter=l,i.add(e);const p=devicePixelRatio,w=Math.round(A*p)/p,v=Math.round(f*p)/p;m=Math.round((A+m)*p)/p-w,g=Math.round((f+g)*p)/p-v;const x=n?u(e):1;x<1&&(d.globalAlpha=x),d.drawImage(e.img,o,r,c,a,w,v,m,g),x<1&&(d.globalAlpha=1,t.requestRedraw())}function f(t,e,n,o,i,r,s,l,a,u,h,A){const f=c(t,l,a,u,h);return!!f&&m(t,f,e,n,o,i,r,s,A)}function m(e,n,o,i,r,s,l,c,a){if(!n.img)return!1;const u=n.z-c,h=2**u,f=n.x-s*h,m=n.y-l*h,g=function(t){return"src"in t}(d=n.img)?d.naturalWidth:d.width;var d;let p,w,v,x;if(u>=0){if(f<0||m<0||f>=h||m>=h)return!1;x=t*r/h,o+=f*x,i+=m*x,p=0,w=0,v=g}else{if(v=g*h,p=-f*g,w=-m*g,p<0||w<0||p>=g||w>=g)return!1;x=t*r}return A(e,n,a,p,w,v,v,o,i,x,x),!0}function g(e,o,i,s,l,c,u,h){if(!a(e,l,c,u,!0)){const h=a(e,2*l,2*c,u+1,!1)&&a(e,2*l,2*c+1,u+1,!1)&&a(e,2*l+1,2*c,u+1,!1)&&a(e,2*l+1,2*c+1,u+1,!1);let A=!1;if(!h){const n=Math.max(u-5,Math.log2(e.getZoomRange()[0]/t)-1);for(let t=u-1;t>=n;t--){const n=u-t;if(A=f(e,o,i,s,l,c,u,l>>n,c>>n,u-n,!1,!1),A)break}}let g=!1;if(!A&&(n?.(e,l,c,u,o,i,t,s),h)){for(let t=0;t<=1;t++)for(let n=0;n<=1;n++)f(e,o,i,s,l,c,u,2*l+t,2*c+n,u+1,!1,!1);g=!0}for(let t=0;t<r.length;t++){const n=r[t];(!g||n.z>=u+2)&&m(e,n,o,i,s,l,c,u,!0)}}f(e,o,i,s,l,c,u,l,c,u,h,!0)}this.draw=(e,n,a,u,h,A,f,m,d,p)=>{const[w,v]=e.getViewBoxSize(),x=w*v/t/t|0;if(r.length=0,i.forEach((t=>t.z>=d+1&&r.length<2*x&&r.push(t))),i.clear(),l++,p)for(let t=f/3|0;t<2*f/3;t++)for(let n=m/3|0;n<2*m/3;n++)c(e,h+t,A+n,d,!0);for(let o=0;o<f;o++)for(let i=0;i<m;i++){g(e,n+o*t*u,a+i*t*u,u,h+o,A+i,d,p)}const y=10*x|0;for(let t=0;t<4&&o.size>y;t++){let t=l-1;o.forEach((e=>t=Math.min(t,e.lastDrawIter))),o.forEach(((e,n)=>{e.lastDrawIter===t&&(o.delete(n),i.delete(e),e.clear?.())}))}s=[h,A,f,m,d]},this.getTileWidth=()=>t,this.clearCache=()=>{o.forEach((t=>t.clear?.())),o.clear(),i.clear(),r.length=0}}function m(t){let e=!0,n=0,o=1,i=-1,r=0;this.unregister=e=>{t.clearCache()},this.redraw=n=>{const o=t.getTileWidth(),i=Math.floor(Math.log2(n.getZoom()/o)+.4),r=2**i,s=n.getZoom()/o/r,l=o*s,[c,a]=n.getViewBoxShift(),[u,h]=n.getViewBoxSize(),A=Math.floor(c/l),f=A*l-c,m=Math.floor(a/l),g=m*l-a,d=1+((u-f)/l|0),p=1+((h-g)/l|0);t.draw(n,f,g,s,A,m,d,p,i,e)},this.onEvent={mapZoom(t,{delta:s}){const l=performance.now(),c=l-n;if(c>250&&(o=1),n=l,o*=s,o<1/1.2||o>1.2){(0===c||Math.abs(s**(1/c)-1)>5e-4)&&(e||l-r>1e3)&&function(t,n){e&&(r=performance.now(),e=!1),clearTimeout(i),i=window.setTimeout((()=>{e=!0,t.requestRedraw()}),n)}(t,80)}}}}function g(t){const e=location.hash.substr(1).split("/"),n=parseFloat(e[0]),o=parseFloat(e[1]),i=parseFloat(e[2]);isNaN(n)||isNaN(o)||isNaN(i)||t.updateLocation(n,o,2**i)}function d(t=9,e=4){let n,o=-1;this.register=t=>{g(t),n=()=>g(t),addEventListener("hashchange",n)},this.unregister=t=>{clearTimeout(o),removeEventListener("hashchange",n)},this.update=n=>{clearTimeout(o),o=window.setTimeout((()=>function(n){o=-1;const i=n.getLon().toFixed(t),r=n.getLat().toFixed(t),s=Math.log2(n.getZoom()).toFixed(e);history.replaceState({},"",`#${i}/${r}/${s}`)}(n)),500)}}function p(t,e){let n,o,i,r,s=new Uint8Array(e),l=0,c=0;for(n=0;n<t.length;n++)o=t.charCodeAt(n),i=126===o,r=c+((i?125:o)-35),s.fill(l,c,r),c=r,l^=!i;return s}let w="jpg",v=null;function x(t,e,n,o,i,r,s,l){if(v&&!v(e,n,o))return null;!function(t,e,n,o,i,r,s,l){const c=t.get2dContext();if(null===c)return;const a=s*l,u=1.5;c.strokeStyle="#8883",c.strokeRect(i+u,r+u,a-3,a-3)}(t,0,0,0,i,r,s,l)}fetch("../tiles/summary.json").then((t=>t.json())).then((t=>{v=function(t){const e=new Map;for(const n of t){const[t,[o,i,r,s],l]=n,c=r-o+1,a=p(l,c*(s-i+1));e.set(t,((t,e)=>t>=o&&t<=r&&e>=i&&e<=s&&!!a[t-o+(e-i)*c]))}return(t,n,o)=>!!e.get(o)?.(t,n)}(t)}));const y=(E=(t,e,n)=>`../tiles/${w}/${n}/${t}/${e}.${w}`,(t,e,n,o)=>{const i=new Image;i.src=E(t,e,n);const r=()=>function(t){t.src=""}(i);i.onload=()=>{const t=window.createImageBitmap;t?t(i).then((t=>o(t,(()=>function(t){t.close()}(t)))),(()=>o(i,r))):o(i,r)},o(null,r)});var E;function b(t,e,n,o){if(v&&!v(t,e,n))return null;y(t,e,n,o)}const M={x2lon:(t,e)=>t/e*192,y2lat:(t,e)=>t/e*192,lon2x:(t,e)=>t*e/192,lat2y:(t,e)=>t*e/192,meters2pixCoef:(t,e)=>e/192};new Promise((t=>{const e=new Image;e.src="data:image/avif;base64,AAAAGGZ0eXBhdmlmAAAAAG1pZjFtaWFmAAAA621ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAHBpY3QAAAAAAAAAAAAAAAAAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABCwAAABYAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgSAAAAAAABNjb2xybmNseAABAA0ABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB5tZGF0EgAKBzgADlAQ0GkyCRAAAAAP+j9P4w==",e.onload=()=>t(!0),e.onerror=()=>t(!1)})).then((e=>{e?location.hash.includes("jpg")?alert(`avif is supported, but forcing ${w}`):w="avif":alert(`avif seems not supported :(\nusing ${w}`);const n=new t(document.body,M);n.setZoomRange(8,512),n.updateLocation(0,0,76.8),n.register(new m(new f(192,b,x))),n.register(new A),n.register(new d(0,2)),n.requestRedraw(),n.resize(),window.onresize=n.resize}));
//# sourceMappingURL=bundle.js.map
