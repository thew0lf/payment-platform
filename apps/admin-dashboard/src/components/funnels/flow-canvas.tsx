'use client';

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FunnelStage, StageType, getStageTypeLabel, getStageTypeIcon } from '@/lib/api/funnels';
import {
  Layout,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  CheckCircle,
  FileText,
  Sliders,
  GripVertical,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// CUSTOM NODE COMPONENT
// ═══════════════════════════════════════════════════════════════

const stageIcons: Record<string, React.ElementType> = {
  LANDING: Layout,
  PRODUCT_SELECTION: ShoppingBag,
  CHECKOUT: CreditCard,
  UPSELL: TrendingUp,
  DOWNSELL: TrendingDown,
  ORDER_BUMP: Plus,
  THANK_YOU: CheckCircle,
  FORM: FileText,
  CUSTOM: Sliders,
};

const stageColors: Record<string, { bg: string; border: string; icon: string }> = {
  LANDING: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', icon: 'text-blue-600' },
  PRODUCT_SELECTION: { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200', icon: 'text-purple-600' },
  CHECKOUT: { bg: 'from-green-50 to-green-100', border: 'border-green-200', icon: 'text-green-600' },
  UPSELL: { bg: 'from-orange-50 to-orange-100', border: 'border-orange-200', icon: 'text-orange-600' },
  DOWNSELL: { bg: 'from-yellow-50 to-yellow-100', border: 'border-yellow-200', icon: 'text-yellow-600' },
  ORDER_BUMP: { bg: 'from-pink-50 to-pink-100', border: 'border-pink-200', icon: 'text-pink-600' },
  THANK_YOU: { bg: 'from-emerald-50 to-emerald-100', border: 'border-emerald-200', icon: 'text-emerald-600' },
  FORM: { bg: 'from-indigo-50 to-indigo-100', border: 'border-indigo-200', icon: 'text-indigo-600' },
  CUSTOM: { bg: 'from-gray-50 to-gray-100', border: 'border-gray-200', icon: 'text-gray-600' },
};

interface StageNodeData {
  stage: FunnelStage;
  onSelect: (stage: FunnelStage) => void;
  isSelected: boolean;
}

function StageNode({ data }: { data: StageNodeData }) {
  const { stage, onSelect, isSelected } = data;
  const Icon = stageIcons[stage.type] || Layout;
  const colors = stageColors[stage.type] || stageColors.CUSTOM;

  return (
    <div
      onClick={() => onSelect(stage)}
      className={`
        group relative cursor-pointer transition-all duration-200
        ${isSelected ? 'scale-105' : 'hover:scale-102'}
      `}
    >
      {/* Main Card */}
      <div
        className={`
          w-56 rounded-2xl border-2 bg-gradient-to-br shadow-lg
          transition-all duration-200
          ${colors.bg} ${colors.border}
          ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 shadow-xl' : 'hover:shadow-xl'}
        `}
      >
        {/* Drag Handle */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-1 bg-white rounded-lg shadow-md border border-gray-200">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center ${colors.icon}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate text-sm">
                {stage.name}
              </h4>
              <p className="text-xs text-gray-500">
                {getStageTypeLabel(stage.type as StageType)}
              </p>
            </div>
          </div>

          {/* Stage Order Badge */}
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-600">{stage.order + 1}</span>
          </div>
        </div>

        {/* Connection Points */}
        <div className="absolute left-1/2 -bottom-3 -translate-x-1/2 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow" />
        {stage.order > 0 && (
          <div className="absolute left-1/2 -top-3 -translate-x-1/2 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow" />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN CANVAS COMPONENT
// ═══════════════════════════════════════════════════════════════

interface FlowCanvasProps {
  stages: FunnelStage[];
  selectedStage: FunnelStage | null;
  onStageSelect: (stage: FunnelStage | null) => void;
  onStagesChange?: (stages: FunnelStage[]) => void;
  disableInteraction?: boolean;
}

export function FlowCanvas({
  stages,
  selectedStage,
  onStageSelect,
  onStagesChange,
  disableInteraction = false,
}: FlowCanvasProps) {
  const nodeTypes: NodeTypes = useMemo(() => ({
    stageNode: StageNode,
  }), []);

  // Convert stages to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return stages.map((stage, index) => ({
      id: stage.id,
      type: 'stageNode',
      position: { x: 250, y: index * 180 + 50 },
      data: {
        stage,
        onSelect: onStageSelect,
        isSelected: selectedStage?.id === stage.id,
      },
    }));
  }, [stages, selectedStage, onStageSelect]);

  // Create edges between stages
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (let i = 0; i < stages.length - 1; i++) {
      edges.push({
        id: `${stages[i].id}-${stages[i + 1].id}`,
        source: stages[i].id,
        target: stages[i + 1].id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6366f1',
        },
      });
    }
    return edges;
  }, [stages]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when stages or selection changes
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-white rounded-xl overflow-hidden border border-gray-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        className="bg-dots-pattern"
        disableKeyboardA11y={disableInteraction}
        nodesDraggable={!disableInteraction}
        nodesConnectable={!disableInteraction}
        elementsSelectable={!disableInteraction}
      >
        <Controls
          className="!bg-white !border !border-gray-200 !rounded-xl !shadow-lg"
          showZoom={true}
          showFitView={true}
          showInteractive={false}
        />
        <MiniMap
          className="!bg-white !border !border-gray-200 !rounded-xl !shadow-lg"
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              LANDING: '#3b82f6',
              PRODUCT_SELECTION: '#a855f7',
              CHECKOUT: '#22c55e',
              UPSELL: '#f97316',
              THANK_YOU: '#10b981',
            };
            const data = node.data as unknown as StageNodeData;
            return colors[data?.stage?.type] || '#6b7280';
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
      </ReactFlow>
    </div>
  );
}

export default FlowCanvas;
