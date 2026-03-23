import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "FridgeWiz – Home",
  description: "Your smart kitchen dashboard",
};

export default function HomePage() {
  return <HomeClient />;
}
