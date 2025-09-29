# ELK与X6集成使用指南

## 概述

ELK (Eclipse Layout Kernel) 是一个功能强大的图形布局算法库，支持多种自动布局算法。本指南详细介绍如何在X6流程图中集成和使用ELK进行自动布局。

## 功能特性

### ✨ 核心功能
- **多种布局算法**：支持分层、力导向、应力、树形、径向等布局
- **智能布局配置**：可配置节点间距、布局方向、边路由等
- **异步处理**：使用Web Worker进行布局计算，不阻塞UI
- **动画过渡**：支持平滑的布局切换动画
- **预设配置**：提供流程图、层次结构、网络图等预设布局

### 🎯 适用场景
- **流程图自动布局**：工作流程、业务流程图
- **组织架构图**：企业组织结构、层次关系图
- **网络拓扑图**：系统架构、网络连接图
- **关系图**：实体关系、依赖关系图

## 安装配置

### 1. 依赖安装
项目已包含必要依赖：
```json
{
  "elkjs": "^0.7.1"
}
```

### 2. 导入模块
```typescript
import { ElkLayoutProcessor, ElkLayoutConfig } from '../utils/ElkLayoutProcessor'
```

## 基本使用

### 1. 创建布局处理器
```typescript
// 基本配置
const elkProcessor = new ElkLayoutProcessor({
  algorithm: 'layered',    // 布局算法
  direction: 'DOWN',       // 布局方向
  spacing: {               // 间距配置
    nodeNodeBetweenLayers: 50,
    edgeNodeBetweenLayers: 25,
    nodeNode: 40,
    edgeEdge: 20
  },
  useWorker: true         // 使用Web Worker
})
```

### 2. 应用布局到图形
```typescript
// 对整个图形应用布局
const layoutResult = await elkProcessor.applyLayoutToGraph(
  graph,                  // X6图形实例
  {
    defaultNodeSize: { width: 120, height: 60 },
    autoCalculateSize: true,
    edgeRouting: 'ORTHOGONAL'
  },
  500                    // 动画时长(ms)
)
```

### 3. 预设布局配置
```typescript
// 使用预设配置
const flowchartConfig = ElkLayoutProcessor.createPresetConfig('flowchart')
const elkProcessor = new ElkLayoutProcessor(flowchartConfig)
```

## 布局算法详解

### 📊 算法类型对比

| 算法 | 适用场景 | 特点 | 推荐用途 |
|------|----------|------|----------|
| **layered** | 分层结构 | 节点按层次排列，边主要在相邻层间 | 流程图、工作流 |
| **force** | 网络关系 | 基于物理力学模拟，节点自然分布 | 社交网络、关系图 |
| **stress** | 复杂网络 | 基于应力最小化，适合复杂拓扑 | 大型网络图 |
| **mrtree** | 树形结构 | 严格的树形层次布局 | 组织架构、分类树 |
| **radial** | 径向分布 | 以中心节点向外放射 | 中心化网络 |

### 🎛️ 布局方向
- **DOWN**: 从上到下（默认）
- **UP**: 从下到上
- **LEFT**: 从右到左
- **RIGHT**: 从左到右

## 高级配置

### 1. 详细间距配置
```typescript
const elkConfig: ElkLayoutConfig = {
  algorithm: 'layered',
  direction: 'DOWN',
  spacing: {
    nodeNodeBetweenLayers: 60,  // 层间节点距离
    edgeNodeBetweenLayers: 30,  // 层间边与节点距离
    nodeNode: 40,               // 同层节点间距
    edgeEdge: 20                // 边与边间距
  },
  layoutOptions: {
    // ELK原生配置选项
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.edge.routing': 'ORTHOGONAL'
  }
}
```

### 2. 自定义节点尺寸处理
```typescript
const layoutOptions = {
  defaultNodeSize: { width: 100, height: 50 },
  autoCalculateSize: true,      // 自动计算节点尺寸
  edgeRouting: 'ORTHOGONAL',    // 边路由类型
  preserveNodeData: true        // 保留原始节点数据
}
```

### 3. 获取布局结果
```typescript
const layoutResult = await elkProcessor.performLayout(nodes, edges)

console.log('布局结果:', {
  nodes: layoutResult.nodes,      // 节点位置信息
  edges: layoutResult.edges,      // 边路径信息
  layoutSize: layoutResult.layoutSize  // 整体布局尺寸
})
```

## 预设布局配置

### 🏢 流程图布局 (flowchart)
```typescript
const config = ElkLayoutProcessor.createPresetConfig('flowchart')
// 特点：分层清晰，适合工作流程
// 算法：layered
// 间距：宽松，便于阅读
```

### 🌳 层次结构布局 (hierarchy)
```typescript
const config = ElkLayoutProcessor.createPresetConfig('hierarchy')
// 特点：严格层次，适合组织架构
// 算法：mrtree
// 间距：层次明确
```

### 🌐 网络布局 (network)
```typescript
const config = ElkLayoutProcessor.createPresetConfig('network')
// 特点：自然分布，适合关系网络
// 算法：force
// 间距：动态平衡
```

### ⭕ 圆形布局 (circular)
```typescript
const config = ElkLayoutProcessor.createPresetConfig('circular')
// 特点：径向分布，适合中心化结构
// 算法：radial
// 间距：放射状排列
```

## 实际应用示例

### 示例1：流程图自动布局
```typescript
// 在现有页面中添加ELK布局功能
export default class FlowchartExample extends React.Component {
  private elkProcessor: ElkLayoutProcessor

  componentDidMount() {
    this.elkProcessor = new ElkLayoutProcessor({
      algorithm: 'layered',
      direction: 'DOWN',
      spacing: {
        nodeNodeBetweenLayers: 50,
        nodeNode: 30
      }
    })
  }

  applyAutoLayout = async () => {
    try {
      await this.elkProcessor.applyLayoutToGraph(
        this.graph,
        { autoCalculateSize: true },
        300
      )
      message.success('自动布局完成！')
    } catch (error) {
      message.error('布局失败')
    }
  }
}
```

### 示例2：动态布局切换
```typescript
const switchLayout = async (algorithm: string) => {
  const elkProcessor = new ElkLayoutProcessor({
    algorithm: algorithm as any,
    direction: 'DOWN'
  })
  
  await elkProcessor.applyLayoutToGraph(graph, {}, 500)
}

// 使用
switchLayout('force')     // 切换到力导向布局
switchLayout('layered')   // 切换到分层布局
```

## 性能优化建议

### 🚀 优化策略
1. **使用Web Worker**: 开启 `useWorker: true` 避免UI阻塞
2. **合理设置间距**: 根据节点数量调整间距参数
3. **分批处理**: 对于大量节点，考虑分批布局
4. **缓存布局结果**: 避免重复计算相同的布局

### 📈 性能参考
- **小型图形** (< 50节点): 布局时间 < 100ms
- **中型图形** (50-200节点): 布局时间 < 500ms  
- **大型图形** (200-1000节点): 布局时间 < 2s

## 常见问题解决

### ❓ 常见问题

**Q: 布局后节点重叠怎么办？**
A: 增加间距配置中的 `nodeNode` 值，或检查节点尺寸设置

**Q: 边的路径不理想？**
A: 尝试不同的 `edgeRouting` 选项：`ORTHOGONAL`、`POLYLINE`、`SPLINES`

**Q: 布局速度慢？**
A: 确保开启 `useWorker: true`，考虑减少节点数量或使用更简单的算法

**Q: 自定义节点样式丢失？**
A: 设置 `preserveNodeData: true` 保留原始节点数据

### 🔧 调试技巧
```typescript
// 开启详细日志
console.log('布局前节点数量:', graph.getNodes().length)
console.log('布局配置:', elkConfig)

const result = await elkProcessor.performLayout(nodes, edges)
console.log('布局结果:', result)
```

## 总结

ELK与X6的集成为流程图提供了强大的自动布局能力，通过合理配置算法和参数，可以显著提升图形的视觉效果和用户体验。建议根据具体的业务场景选择合适的布局算法和配置。