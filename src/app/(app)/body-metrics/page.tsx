"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import BodyMetricsDashboard from "@/components/body-metrics/BodyMetricsDashboard";
import BodyMetricsForm from "@/components/body-metrics/BodyMetricsForm";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { queryKeys } from "@/lib/queries";

export default function BodyMetricsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.bodyMetrics.all });
  }, [queryClient]);

  return (
    <PullToRefresh onRefresh={handleRefresh} className="space-y-5 p-4 pb-32">
      <h1 className="text-lg font-bold">체성분 분석</h1>
      <BodyMetricsDashboard onAddClick={() => setFormOpen(true)} />
      <BodyMetricsForm open={formOpen} onClose={() => setFormOpen(false)} />
    </PullToRefresh>
  );
}
