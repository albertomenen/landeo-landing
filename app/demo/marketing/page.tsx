import type { Metadata } from "next";
import ProductApp from "../../../components/ProductApp";

export const metadata: Metadata = {
  title: "Landeo — Marketing Demo",
  description:
    "Entorno aislado con datos ficticios para demostraciones de Landeo.",
  robots: { index: false, follow: false },
};

export default function MarketingDemoPage() {
  return <ProductApp view="jobs" demo />;
}
