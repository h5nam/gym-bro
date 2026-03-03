"use client";

import { useState } from "react";
import BodyMetricsDashboard from "@/components/body-metrics/BodyMetricsDashboard";
import BodyMetricsForm from "@/components/body-metrics/BodyMetricsForm";

export default function BodyMetricsPage() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-5 p-4 pb-32">
      <h1 className="text-lg font-bold">체성분 분석</h1>
      <BodyMetricsDashboard onAddClick={() => setFormOpen(true)} />
      <BodyMetricsForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
