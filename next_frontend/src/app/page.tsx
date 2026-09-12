import { EntryGateway } from "@/components/home/EntryGateway";
import { HeroSection } from "@/components/home/HeroSection";
import { EcosystemSection } from "@/components/home/EcosystemSection";
import { PatientJourney } from "@/components/home/PatientJourney";
import { DiagnosticsSection } from "@/components/home/DiagnosticsSection";
import { DoctorsSection } from "@/components/home/DoctorsSection";
import { HospitalsSection } from "@/components/home/HospitalsSection";
import { AiIntelligence } from "@/components/home/AiIntelligence";
import { StatisticsSection } from "@/components/home/StatisticsSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { CtaSection } from "@/components/home/CtaSection";

export default function Home() {
  return (
    <>
      <EntryGateway />
      <HeroSection />
      <EcosystemSection />
      <PatientJourney />
      <DiagnosticsSection />
      <DoctorsSection />
      <HospitalsSection />
      <AiIntelligence />
      <StatisticsSection />
      <TestimonialsSection />
      <CtaSection />
    </>
  );
}
