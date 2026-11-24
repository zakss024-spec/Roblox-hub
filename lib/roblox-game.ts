import type { RobloxExperience } from "@/lib/roblox-discovery";
type Place={placeId:number;name?:string;description?:string;builder?:string;url?:string;universeId?:number};
type Info={id:number;name?:string;description?:string;creator?:{name?:string};playing?:number;visits?:number;rootPlaceId?:number};
async function json<T>(url:string):Promise<T|null>{try{const r=await fetch(url,{headers:{Accept:"application/json","User-Agent":"ROBLOX-HUB/1.0"},next:{revalidate:300}});return r.ok?await r.json() as T:null;}catch{return null;}}
export async function getRobloxGameByPlaceId(id:number):Promise<RobloxExperience|null>{
 if(!Number.isSafeInteger(id)||id<=0)return null;
 const fallback:RobloxExperience={id:"roblox-"+id,placeId:id,universeId:null,name:"Roblox Experience",description:"Detail resmi game sedang tidak tersedia dari Roblox. Kamu tetap bisa membuka game ini langsung di Roblox.",creator:"Roblox creator",genre:"Roblox experience",playing:null,visits:null,thumbnailUrl:null,url:"https://www.roblox.com/games/"+id,source:"ROBLOX"};
 const places=await json<Place[]>("https://games.roblox.com/v1/games/multiget-place-details?placeIds="+id);
 const place=places?.find((item)=>item.placeId===id);
 if(!place)return fallback;
 const uid=place.universeId??null;
 const [games,icons]=await Promise.all([uid?json<{data?:Info[]}>("https://games.roblox.com/v1/games?universeIds="+uid):Promise.resolve(null),json<{data?:Array<{imageUrl?:string}>}>("https://thumbnails.roblox.com/v1/places/gameicons?placeIds="+id+"&size=512x512&format=Png&isCircular=false")]);
 const g=games?.data?.[0];
 return{id:"roblox-"+id,placeId:id,universeId:uid,name:g?.name||place.name||fallback.name,description:g?.description||place.description||fallback.description,creator:g?.creator?.name||place.builder||fallback.creator,genre:"Roblox experience",playing:g?.playing??null,visits:g?.visits??null,thumbnailUrl:icons?.data?.[0]?.imageUrl??null,url:place.url||fallback.url,source:"ROBLOX"};
}
