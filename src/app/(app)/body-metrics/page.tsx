import BodyMetricsForm from "@/components/body-metrics/BodyMetricsForm";
import BodyMetricsList from "@/components/body-metrics/BodyMetricsList";

export default function BodyMetricsPage() {
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-bold">체성분</h1>
      <BodyMetricsForm />
      <BodyMetricsList />
    </div>
  );
}
