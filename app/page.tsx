import MouseGlow from "@/components/MouseGlow";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Works from "@/components/Works";
import Beliefs from "@/components/Beliefs";
import Thoughts from "@/components/Thoughts";
import SystemCard from "@/components/SystemCard";
import Timeline from "@/components/Timeline";
import ChinaMap from "@/components/ChinaMap";
import RecentThinking from "@/components/RecentThinking";
import Guestbook from "@/components/Guestbook";
import Footer from "@/components/Footer";
import ScrollArrow from "@/components/ScrollArrow";

export default function Home() {
  return (
    <main>
      <MouseGlow />
      <Nav />
      <Hero />
      <ScrollArrow to="works" />
      <Works />
      <ScrollArrow to="beliefs" />
      <div id="beliefs">
        <Beliefs />
      </div>
      <ScrollArrow to="mind" />
      <Thoughts />
      <SystemCard />
      <ScrollArrow to="timeline" />
      <Timeline />
      <ScrollArrow to="map" />
      <ChinaMap />
      <ScrollArrow to="recent" />
      <RecentThinking />
      <ScrollArrow to="guestbook" />
      <Guestbook />
      <Footer />
    </main>
  );
}
