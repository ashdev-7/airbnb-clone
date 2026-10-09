import { Footer } from "@/components/layout/footer";
import { MainHeader } from "@/components/layout/main-header";

/** The travelling pages: main header above, footer below (plan §7.4). */
export default function TravelingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <MainHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </>
  );
}
