"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
type Obj={id:string;type:"block"|"platform"|"coin"|"checkpoint";x:number;y:number;z:number;w:number;h:number;d:number;color:string};
export default function SceneViewport3D({objects,selected,onSelect,onMove}:{objects:Obj[];selected:string|null;onSelect:(id:string|null)=>void;onMove:(id:string,x:number,z:number)=>void}){
 const host=useRef<HTMLDivElement>(null);
 const api=useRef<{renderer:THREE.WebGLRenderer;scene:THREE.Scene;camera:THREE.PerspectiveCamera;controls:OrbitControls;ray:THREE.Raycaster;pointer:THREE.Vector2;plane:THREE.Plane;drag:string|null;offset:THREE.Vector3;objects:Map<string,THREE.Object3D>;frame:number}|null>(null);
 useEffect(()=>{
  const root=host.current;if(!root)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color("#91b9d0");scene.fog=new THREE.Fog("#91b9d0",45,105);
  const camera=new THREE.PerspectiveCamera(48,root.clientWidth/root.clientHeight,.1,250);camera.position.set(15,14,18);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setSize(root.clientWidth,root.clientHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;root.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight("#e7f7ff","#526c42",2));
  const sun=new THREE.DirectionalLight("#fff1d6",3.1);sun.position.set(-12,24,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:"#73a95b",roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;scene.add(ground);
  const grid=new THREE.GridHelper(100,100,"#d8e6c9","#a7c28f");grid.position.y=.005;scene.add(grid);
  const axes=new THREE.AxesHelper(3);axes.position.set(-.02,.02,-.02);scene.add(axes);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=5;controls.maxDistance=65;controls.maxPolarAngle=Math.PI*.485;
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),offset=new THREE.Vector3();
  const state={renderer,scene,camera,controls,ray,pointer,plane,drag:null as string|null,offset,objects:new Map<string,THREE.Object3D>(),frame:0};
  api.current=state;
  const resize=()=>{if(!host.current)return;const w=host.current.clientWidth,h=host.current.clientHeight;camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.setSize(w,h)};
  const observer=new ResizeObserver(resize);observer.observe(root);
  const animate=()=>{state.frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)};animate();
  const point=(e:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();pointer.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(pointer,camera)};
  const down=(e:PointerEvent)=>{point(e);const hits=ray.intersectObjects([...state.objects.values()],true);const hit=hits.find(h=>{let o:THREE.Object3D|null=h.object;while(o&&o.userData.objectId===undefined)o=o.parent;return Boolean(o)});if(!hit){onSelect(null);return}let target:THREE.Object3D|null=hit.object;while(target&&target.userData.objectId===undefined)target=target.parent;if(!target)return;const id=String(target.userData.objectId);onSelect(id);state.drag=id;controls.enabled=false;const p=new THREE.Vector3();ray.ray.intersectPlane(plane,p);state.offset.copy(target.position).sub(p);renderer.domElement.setPointerCapture(e.pointerId)};
  const move=(e:PointerEvent)=>{if(!state.drag)return;point(e);const p=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,p))return;const target=state.objects.get(state.drag);if(!target)return;target.position.x=Math.round((p.x+state.offset.x)*4)/4;target.position.z=Math.round((p.z+state.offset.z)*4)/4;onMove(state.drag,target.position.x,target.position.z)};
  const up=()=>{state.drag=null;controls.enabled=true};
  renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointermove",move);renderer.domElement.addEventListener("pointerup",up);renderer.domElement.addEventListener("pointercancel",up);
  return()=>{cancelAnimationFrame(state.frame);observer.disconnect();renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("pointerup",up);renderer.domElement.removeEventListener("pointercancel",up);controls.dispose();renderer.dispose();root.removeChild(renderer.domElement);api.current=null};
 },[onSelect,onMove]);
 useEffect(()=>{const state=api.current;if(!state)return;const live=new Set(objects.map(o=>o.id));for(const [id,obj] of state.objects){if(!live.has(id)){state.scene.remove(obj);obj.traverse(n=>{if(n instanceof THREE.Mesh){n.geometry.dispose();const m=n.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose()}});state.objects.delete(id)}}
 for(const o of objects){let group=state.objects.get(o.id);if(!group){group=new THREE.Group();group.userData.objectId=o.id;let mesh:THREE.Mesh;if(o.type==="coin"){mesh=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.12,32),new THREE.MeshStandardMaterial({color:o.color,metalness:.75,roughness:.22,emissive:o.color,emissiveIntensity:.12}));mesh.rotation.z=Math.PI/2}else if(o.type==="checkpoint"){mesh=new THREE.Mesh(new THREE.BoxGeometry(.16,2.6,.16),new THREE.MeshStandardMaterial({color:o.color}));const flag=new THREE.Mesh(new THREE.BoxGeometry(1.2,.72,.08),new THREE.MeshStandardMaterial({color:"#ff794c"}));flag.position.set(.6,.86,0);group.add(flag)}else{mesh=new THREE.Mesh(new THREE.BoxGeometry(o.w,o.h,o.d),new THREE.MeshStandardMaterial({color:o.color,roughness:.68,metalness:.05}))}mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.objectId=o.id;group.add(mesh);state.scene.add(group);state.objects.set(o.id,group)}
 group.position.set(o.x,o.y+(o.type==="coin"?.8:0),o.z);const mesh=group.children.find(x=>x instanceof THREE.Mesh) as THREE.Mesh|undefined;if(mesh&&mesh.material instanceof THREE.MeshStandardMaterial){mesh.material.color.set(o.color);mesh.scale.set(o.type==="coin"?1:o.w,o.type==="coin"?1:o.h,o.type==="coin"?1:o.d)}group.traverse(x=>{if(x instanceof THREE.Mesh){const material=x.material;if(material instanceof THREE.MeshStandardMaterial){material.emissive.set(selected===o.id? "#263d12":"#000000");material.emissiveIntensity=selected===o.id?.28:0}}})}
 },[objects,selected]);
 return <div ref={host} className="studio-three-viewport" aria-label="Interactive 3D world viewport"><div className="studio-three-hud"><span>3D EDITOR · REALTIME VIEWPORT</span><span>DRAG TO ORBIT · SCROLL TO ZOOM</span></div><div className="studio-three-axis">X / Y / Z</div></div>;
}
