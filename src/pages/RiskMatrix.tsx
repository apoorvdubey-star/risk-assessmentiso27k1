import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { getRiskLevel } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const COLORS: Record<string, string> = {
  Low: 'bg-risk-low/80',
  Medium: 'bg-risk-medium/80',
  High: 'bg-risk-high/80',
  Critical: 'bg-risk-critical/80',
};

export default function RiskMatrix() {
  const { risks, assets, settings } = useApp();
  const size = settings.riskMatrixType === '3x3' ? 3 : 5;

  const riskMap = useMemo(() => {
    const map: Record<string, typeof risks> = {};
    risks.forEach(r => {
      const key = `${r.likelihood}-${r.impact}`;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [risks]);

  const getAssetName = (id: string) => assets.find(a => a.id === id)?.assetName || '?';

  const labels3 = ['Low (1)', 'Medium (2-3)', 'High (4-5)'];
  const labels5 = ['1', '2', '3', '4', '5'];
  const labels = size === 3 ? labels3 : labels5;

  const getCellRisks = (row: number, col: number) => {
    if (size === 5) return riskMap[`${row}-${col}`] || [];
    const lRanges: number[][] = [[1], [2, 3], [4, 5]];
    const iRanges: number[][] = [[1], [2, 3], [4, 5]];
    const result: typeof risks = [];
    for (const l of lRanges[row - 1]) {
      for (const i of iRanges[col - 1]) {
        const key = `${l}-${i}`;
        if (riskMap[key]) result.push(...riskMap[key]);
      }
    }
    return result;
  };

  const getCellLevel = (row: number, col: number): string => {
    if (size === 5) return getRiskLevel(row * col);
    const midL = [1, 2.5, 4.5];
    const midI = [1, 2.5, 4.5];
    return getRiskLevel(Math.round(midL[row - 1] * midI[col - 1]));
  };

  return (
    <div className="p-6 split-panel h-full">
      <h1 className="text-2xl font-bold mb-4">Risk Matrix ({size}×{size})</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">Likelihood × Impact</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <div className="flex items-end mb-2 ml-24">
              <span className="text-xs text-muted-foreground font-medium w-full text-center">Impact →</span>
            </div>
            <div className="flex">
              <div className="flex flex-col justify-center mr-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                <span className="text-xs text-muted-foreground font-medium">Likelihood →</span>
              </div>
              <div>
                {/* Header row */}
                <div className="flex ml-20">
                  {labels.map((l, i) => (
                    <div key={i} className="w-24 text-center text-xs text-muted-foreground font-medium py-1">{l}</div>
                  ))}
                </div>
                {/* Matrix rows (top = highest likelihood) */}
                {Array.from({ length: size }, (_, ri) => size - ri).map(row => (
                  <div key={row} className="flex items-center">
                    <div className="w-20 text-right pr-2 text-xs text-muted-foreground font-medium">{labels[row - 1]}</div>
                    {Array.from({ length: size }, (_, ci) => ci + 1).map(col => {
                      const level = getCellLevel(row, col);
                      const cellRisks = getCellRisks(row, col);
                      return (
                        <Tooltip key={col}>
                          <TooltipTrigger asChild>
                            <div className={`w-24 h-20 border border-background/50 ${COLORS[level]} flex items-center justify-center cursor-default relative`}>
                              {cellRisks.length > 0 && (
                                <div className="bg-background/90 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                                  {cellRisks.length}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          {cellRisks.length > 0 && (
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-1">
                                {cellRisks.slice(0, 5).map(r => (
                                  <p key={r.id} className="text-xs">{getAssetName(r.linkedAssetId)}: {r.threat}</p>
                                ))}
                                {cellRisks.length > 5 && <p className="text-xs text-muted-foreground">+{cellRisks.length - 5} more</p>}
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            {['Low', 'Medium', 'High', 'Critical'].map(l => (
              <div key={l} className="flex items-center gap-1.5 text-xs">
                <div className={`w-3 h-3 rounded ${COLORS[l]}`} />
                <span>{l}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
