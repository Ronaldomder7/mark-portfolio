import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Works from "@/components/Works";
import Beliefs from "@/components/Beliefs";
import Thoughts from "@/components/Thoughts";
import SystemCard from "@/components/SystemCard";
import Timeline from "@/components/Timeline";
import RecentThinking from "@/components/RecentThinking";
import Guestbook from "@/components/Guestbook";
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
      <Guestbook />
      <Footer />
    </main>
  );
}
