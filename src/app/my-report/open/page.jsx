import ReportOpening from '../../../components/ReportOpening';

export const metadata = {title: 'Preparing your report | NumericcVaastu', robots: {index: false, follow: false}};

/** Shown in the new tab while the server builds the PDF (15–20 seconds the first time), then replaced by it. */
export default function Page() {
  return <ReportOpening/>;
}
