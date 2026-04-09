import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Works from "@/components/Works";
import Beliefs from "@/components/Beliefs";
import Thoughts from "@/components/Thoughts";
import SystemCard from "@/components/SystemCard";
import Timeline from "@/components/Timeline";
import RecentThinking from "@/components/RecentThinking";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Works />
      <Beliefs />
      <Thoughts />
      <SystemCard />
      <Timeline />
      <RecentThinking />
      <Footer />
    </main>
  );
}
