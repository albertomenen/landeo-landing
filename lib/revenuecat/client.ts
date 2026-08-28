import {Purchases} from "@revenuecat/purchases-js";

export function configureRevenueCat(appUserId:string){
  const apiKey=process.env.NEXT_PUBLIC_REVENUECAT_WEB_PUBLIC_KEY;
  if(!apiKey)throw new Error("RevenueCat Web no está configurado.");
  return Purchases.configure(apiKey,appUserId);
}
