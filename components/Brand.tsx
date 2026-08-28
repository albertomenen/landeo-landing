import Link from "next/link";

export function Brand({compact=false}:{compact?:boolean}){
  return <Link className="brand" href="/" aria-label="Landeo, inicio"><span className="brand-mark">L</span>{!compact&&<span>Landeo</span>}</Link>;
}
