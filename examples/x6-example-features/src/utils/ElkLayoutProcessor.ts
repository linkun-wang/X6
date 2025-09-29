/**
 * ELK布局处理器 - 用于X6流程图的自动布局
 * 支持多种布局算法和自定义配置
 * 适配elkjs 0.11.0版本
 */
import { Graph, Node, Edge } from '@antv/x6'
import ELK, { ElkNode, ElkExtendedEdge, LayoutOptions } from 'elkjs'

// 类型定义
type ELKInstance = InstanceType<typeof ELK>

export interface ElkLayoutConfig {
  /** 布局算法类型 */
  algorithm?: 'layered' | 'force' | 'stress' | 'mrtree' | 'radial'
  /** 布局方向 */
  direction?: 'UNDEFINED' | 'RIGHT' | 'LEFT' | 'DOWN' | 'UP'
  /** 节点间距 */
  spacing?: {
    nodeNodeBetweenLayers?: number
    edgeNodeBetweenLayers?: number
    nodeNode?: number
    edgeEdge?: number
  }
  /** 是否使用Web Worker */
  useWorker?: boolean
  /** 自定义Worker URL，未指定时使用本地文件 */
  workerUrl?: string
  /** 自定义布局选项 */
  layoutOptions?: LayoutOptions
}

export interface X6ToElkOptions {
  /** 节点默认尺寸 */
  defaultNodeSize?: { width: number; height: number }
  /** 是否自动计算节点尺寸 */
  autoCalculateSize?: boolean
  /** 边的路由类型 */
  edgeRouting?: 'ORTHOGONAL' | 'POLYLINE' | 'SPLINES'
  /** 是否保留原始节点数据 */
  preserveNodeData?: boolean
}

export interface ElkLayoutResult {
  /** 布局后的节点位置信息 */
  nodes: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
    originalNode?: Node
  }>
  /** 布局后的边信息 */
  edges: Array<{
    id: string
    source: string
    target: string
    vertices?: Array<{ x: number; y: number }>
    originalEdge?: Edge
  }>
  /** 整体布局尺寸 */
  layoutSize: { width: number; height: number }
}

export class ElkLayoutProcessor {
  private elk: ELKInstance
  private config: Required<Omit<ElkLayoutConfig, 'workerUrl'>> & Pick<ElkLayoutConfig, 'workerUrl'>

  constructor(config: ElkLayoutConfig = {}) {
    // 默认配置
    this.config = {
      algorithm: 'layered',
      direction: 'DOWN',
      spacing: {
        nodeNodeBetweenLayers: 25,
        edgeNodeBetweenLayers: 15,
        nodeNode: 20,
        edgeEdge: 15
      },
      useWorker: true,
      layoutOptions: {},
      ...config
    }

    // 初始化ELK实例 - 适配elkjs 0.11.0，支持离线环境
    if (this.config.useWorker) {
      try {
        let workerUrl = config.workerUrl
        
        if (!workerUrl) {
          // 使用本地worker文件，支持离线和局域网环境
          workerUrl = new URL('../../../node_modules/elkjs/lib/elk-worker.min.js', import.meta.url).href
        }
        
        this.elk = new ELK({ workerUrl })
        console.log('使用Web Worker模式，路径:', workerUrl)
      } catch (error) {
        console.warn('Web Worker 初始化失败，尝试使用默认配置:', error)
        try {
          // 备选方案：让elkjs自动处理worker路径
          this.elk = new ELK()
          console.log('使用默认Web Worker配置')
        } catch (fallbackError) {
          console.warn('Web Worker 完全失败，使用同步模式:', fallbackError)
          this.elk = new ELK()
          this.config.useWorker = false // 更新配置状态
        }
      }
    } else {
      this.elk = new ELK()
      console.log('使用同步模式（未启用Web Worker）')
    }
  }

  /**
   * 将X6图形数据转换为ELK布局数据格式
   */
  convertX6ToElk(nodes: Node[], edges: Edge[], options: X6ToElkOptions = {}): ElkNode {
    const opts = {
      defaultNodeSize: { width: 80, height: 40 },
      autoCalculateSize: true,
      edgeRouting: 'ORTHOGONAL' as const,
      preserveNodeData: true,
      ...options
    }

    // 转换节点
    const elkNodes: ElkNode[] = nodes.map(node => {
      const position = node.getPosition()
      const size = node.getSize()
      
      // 自动计算或使用默认尺寸
      const width = opts.autoCalculateSize && size.width > 0 
        ? size.width 
        : opts.defaultNodeSize.width
      const height = opts.autoCalculateSize && size.height > 0 
        ? size.height 
        : opts.defaultNodeSize.height

      const elkNode: ElkNode = {
        id: node.id,
        width,
        height,
        // 保留原始数据用于后续处理
        ...(opts.preserveNodeData && { x6Data: node.toJSON() })
      }

      // 添加标签信息
      const nodeData = node.toJSON()
      const labelText = nodeData.label || nodeData.attrs?.text?.text || nodeData.attrs?.label?.text
      if (labelText) {
        elkNode.labels = [{ id: `${node.id}-label`, text: labelText }]
      }

      return elkNode
    })

    // 转换边
    const elkEdges: ElkExtendedEdge[] = edges.map(edge => {
      const source = edge.getSourceCellId()
      const target = edge.getTargetCellId()
      
      return {
        id: edge.id,
        sources: [source],
        targets: [target],
        // 保留原始数据
        ...(opts.preserveNodeData && { x6Data: edge.toJSON() })
      }
    })

    // 构建ELK根节点
    const elkGraph: ElkNode = {
      id: 'root',
      layoutOptions: this.buildLayoutOptions(opts),
      children: elkNodes,
      edges: elkEdges
    }

    return elkGraph
  }

  /**
   * 构建ELK布局选项
   */
  private buildLayoutOptions(options: X6ToElkOptions): LayoutOptions {
    const spacing = this.config.spacing
    const layoutOptions: LayoutOptions = {
      'elk.algorithm': this.config.algorithm,
      'elk.direction': this.config.direction,
      
      // 基础间距配置 - 增大间距避免重叠
      'elk.spacing.nodeNode': Math.max(spacing.nodeNode || 30, 30).toString(),
      'elk.layered.spacing.nodeNodeBetweenLayers': Math.max(spacing.nodeNodeBetweenLayers || 60, 60).toString(),
      'elk.layered.spacing.edgeNodeBetweenLayers': Math.max(spacing.edgeNodeBetweenLayers || 30, 30).toString(),
      'elk.spacing.edgeEdge': Math.max(spacing.edgeEdge || 20, 20).toString(),
      
      // 边路由配置 - 使用正交路由减少混乱
      'elk.edge.routing': options.edgeRouting || 'ORTHOGONAL',
      
      // 分层布局优化配置
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',
      
      // 节点排列优化
      'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
      'elk.layered.compaction.postCompaction.constraints': 'SEQUENCE',
      
      // 边优化配置
      'elk.layered.edgeRouting.selfLoopDistribution': 'EQUALLY',
      'elk.layered.edgeRouting.selfLoopOrdering': 'STACKED',
      
      // 布局质量优化
      'elk.layered.thoroughness': '100',
      'elk.layered.unnecessaryBendpoints': 'true',
      
      // 端口配置
      'elk.portConstraints': 'FIXED_SIDE',
      'elk.port.side': 'SOUTH',
      
      // 合并自定义配置
      ...this.config.layoutOptions
    }

    return layoutOptions
  }

  /**
   * 执行ELK布局计算
   */
  async performLayout(
    nodes: Node[], 
    edges: Edge[], 
    options: X6ToElkOptions = {}
  ): Promise<ElkLayoutResult> {
    try {
      // 转换为ELK格式
      const elkGraph = this.convertX6ToElk(nodes, edges, options)
      
      console.log('开始ELK布局计算...', {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        algorithm: this.config.algorithm
      })

      // 执行布局计算
      const layoutResult = await this.elk.layout(elkGraph)
      
      console.log('ELK布局计算完成', layoutResult)

      // 转换回X6格式
      return this.convertElkToX6(layoutResult, nodes, edges)
      
    } catch (error) {
      console.error('ELK布局计算失败:', error)
      throw error
    }
  }

  /**
   * 将ELK布局结果转换回X6格式
   */
  private convertElkToX6(
    elkResult: ElkNode, 
    originalNodes: Node[], 
    originalEdges: Edge[]
  ): ElkLayoutResult {
    const nodeMap = new Map(originalNodes.map(node => [node.id, node]))
    const edgeMap = new Map(originalEdges.map(edge => [edge.id, edge]))

    // 处理节点位置
    const nodes = (elkResult.children || []).map(elkNode => ({
      id: elkNode.id,
      x: elkNode.x || 0,
      y: elkNode.y || 0,
      width: elkNode.width || 80,
      height: elkNode.height || 40,
      originalNode: nodeMap.get(elkNode.id)
    }))

    // 处理边和路径点
    const edges = (elkResult.edges || []).map(elkEdge => {
      const extendedEdge = elkEdge as ElkExtendedEdge
      const sections = extendedEdge.sections || []
      const vertices = sections.length > 0 ? sections[0].bendPoints || [] : []
      
      // 获取源和目标节点ID
      const sourceId = extendedEdge.sources?.[0] || ''
      const targetId = extendedEdge.targets?.[0] || ''

      return {
        id: elkEdge.id,
        source: sourceId,
        target: targetId,
        vertices: vertices.map(point => ({ x: point.x, y: point.y })),
        originalEdge: edgeMap.get(elkEdge.id)
      }
    })

    // 计算整体布局尺寸
    const layoutSize = {
      width: elkResult.width || 0,
      height: elkResult.height || 0
    }

    return { nodes, edges, layoutSize }
  }

  /**
   * 专门的流程图布局 - 实现连线横平竖直、节点中心对齐
   */
  async applyFlowchartLayout(
    graph: Graph,
    options: X6ToElkOptions & {
      elkConfig?: Partial<ElkLayoutConfig>
      animationDuration?: number
    } = {}
  ): Promise<ElkLayoutResult> {
    const nodes = graph.getNodes()
    const edges = graph.getEdges()
    
    if (nodes.length === 0) {
      console.warn('没有节点需要布局')
      return { nodes: [], edges: [], layoutSize: { width: 0, height: 0 } }
    }
    
    console.log('开始流程图专用布局...', {
      nodeCount: nodes.length,
      edgeCount: edges.length
    })
    
    // 流程图专用配置
    const flowchartConfig: ElkLayoutConfig = {
      algorithm: 'layered',
      direction: 'DOWN',
      spacing: {
        nodeNodeBetweenLayers: 100,  // 更大的层间距离
        edgeNodeBetweenLayers: 50,
        nodeNode: 80,                // 更大的同层节点间距
        edgeEdge: 30
      },
      useWorker: true,
      layoutOptions: {
        // 核心：实现横平竖直连线
        'elk.edge.routing': 'ORTHOGONAL',
        
        // 节点对齐和居中
        'elk.alignment': 'CENTER',
        'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
        'elk.layered.nodePlacement.favorStraightEdges': 'true',
        'elk.layered.nodePlacement.linearSegmentsDeflectionDampening': '0.2',
        
        // 交叉最小化
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.layered.crossingMinimization.greedySwitch.type': 'TWO_SIDED',
        
        // 连线优化：减少弯点，保持直线
        'elk.layered.unnecessaryBendpoints': 'true',
        'elk.layered.straightening.strategy': 'IMPROVE_STRAIGHTNESS',
        
        // 紧凑化和后处理
        'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
        'elk.layered.compaction.postCompaction.constraints': 'SEQUENCE',
        'elk.layered.compaction.connectedComponents': 'true',
        
        // 提高计算质量
        'elk.layered.thoroughness': '100',
        'elk.layered.cycleBreaking.strategy': 'GREEDY',
        
        // 端口配置：确保连线从节点中心出去
        'elk.portConstraints': 'FREE',
        'elk.portAlignment': 'CENTER',
        'elk.port.borderOffset': '0',
        
        // 边的细节配置
        'elk.layered.edgeRouting.selfLoopDistribution': 'EQUALLY',
        'elk.layered.edgeRouting.selfLoopOrdering': 'STACKED',
        'elk.spacing.portPort': '10',
        
        // 特殊配置：保持连线整齐
        'elk.layered.mergeEdges': 'true', // 可以允许连线重叠
        'elk.separateConnectedComponents': 'false'
      }
    }
    
    // 合并用户自定义选项
    const mergedConfig: ElkLayoutConfig = {
      ...flowchartConfig,
      ...options.elkConfig,
      layoutOptions: {
        ...flowchartConfig.layoutOptions,
        ...(options.elkConfig?.layoutOptions || {})
      }
    }
    
    // 创建优化的布局处理器
    const elkProcessor = new ElkLayoutProcessor(mergedConfig)
    
    // 布局选项
    const layoutOptions: X6ToElkOptions = {
      defaultNodeSize: { width: 120, height: 50 },
      autoCalculateSize: true,
      edgeRouting: 'ORTHOGONAL', // 强制使用正交线
      preserveNodeData: true,
      ...options
    }
    
    // 执行布局
    const result = await elkProcessor.applyLayoutToGraph(
      graph,
      layoutOptions,
      options.animationDuration || 600
    )
    
    console.log('流程图布局完成！', {
      nodeCount: result.nodes.length,
      edgeCount: result.edges.length,
      layoutSize: result.layoutSize
    })
    
    return result
  }

  /**
   * 应用布局结果到X6图形
   */
  async applyLayoutToGraph(
    graph: Graph, 
    layoutOptions: X6ToElkOptions = {},
    animationDuration: number = 300
  ): Promise<ElkLayoutResult> {
    const nodes = graph.getNodes()
    const edges = graph.getEdges()

    if (nodes.length === 0) {
      console.warn('没有节点需要布局')
      return { nodes: [], edges: [], layoutSize: { width: 0, height: 0 } }
    }

    // 执行布局计算
    const layoutResult = await this.performLayout(nodes, edges, layoutOptions)

    // 应用节点位置
    if (animationDuration > 0) {
      // 使用动画过渡
      layoutResult.nodes.forEach(nodeResult => {
        const node = nodeResult.originalNode
        if (node) {
          node.position(nodeResult.x, nodeResult.y, { 
            transition: { 
              duration: animationDuration,
              timing: 'ease-in-out'
            }
          })
        }
      })
    } else {
      // 直接设置位置
      layoutResult.nodes.forEach(nodeResult => {
        const node = nodeResult.originalNode
        if (node) {
          node.position(nodeResult.x, nodeResult.y)
        }
      })
    }

    // 应用边的路径点
    layoutResult.edges.forEach(edgeResult => {
      const edge = edgeResult.originalEdge
      if (edge && edgeResult.vertices && edgeResult.vertices.length > 0) {
        edge.setVertices(edgeResult.vertices)
      }
    })

    console.log('布局应用完成', {
      nodeCount: layoutResult.nodes.length,
      edgeCount: layoutResult.edges.length,
      layoutSize: layoutResult.layoutSize
    })

    return layoutResult
  }

  /**
   * 创建预设布局配置
   */
  static createPresetConfig(preset: 'flowchart' | 'hierarchy' | 'network' | 'circular' | 'clear'): ElkLayoutConfig {
    const presets: Record<string, ElkLayoutConfig> = {
      // 流程图布局 - 适合工作流程图，优化连线横平竖直和节点中心对齐
      flowchart: {
        algorithm: 'layered',
        direction: 'DOWN',
        spacing: {
          nodeNodeBetweenLayers: 80,  // 增大层间距离确保清晰
          edgeNodeBetweenLayers: 40,   // 增大边节点间距
          nodeNode: 60,                // 增大同层节点间距
          edgeEdge: 20                 // 边间距
        },
        layoutOptions: {
          // 核心配置：实现横平竖直的连线
          'elk.edge.routing': 'ORTHOGONAL',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
          
          // 节点中心对齐配置
          'elk.alignment': 'CENTER',
          'elk.layered.nodePlacement.favorStraightEdges': 'true',
          'elk.layered.nodePlacement.linearSegmentsDeflectionDampening': '0.3',
          
          // 连线优化：减少不必要的弯点
          'elk.layered.unnecessaryBendpoints': 'true',
          'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
          'elk.layered.compaction.postCompaction.constraints': 'SEQUENCE',
          
          // 边路由精细调整
          'elk.layered.edgeRouting.selfLoopDistribution': 'EQUALLY',
          'elk.layered.edgeRouting.selfLoopOrdering': 'STACKED',
          'elk.layered.edgeRouting.splines.mode': 'CONSERVATIVE',
          
          // 提高布局质量
          'elk.layered.thoroughness': '100',
          'elk.layered.cycleBreaking.strategy': 'GREEDY',
          
          // 端口和连接点配置
          'elk.portConstraints': 'FIXED_SIDE',
          'elk.portAlignment': 'CENTER'
        }
      },
      
      // 层次结构布局 - 适合组织架构图
      hierarchy: {
        algorithm: 'mrtree',
        direction: 'DOWN',
        spacing: {
          nodeNodeBetweenLayers: 60,
          edgeNodeBetweenLayers: 30,
          nodeNode: 40,
          edgeEdge: 20
        }
      },
      
      // 网络布局 - 适合网络拓扑图
      network: {
        algorithm: 'force',
        direction: 'UNDEFINED',
        spacing: {
          nodeNode: 50,
          edgeEdge: 25
        }
      },
      
      // 圆形布局 - 适合关系图
      circular: {
        algorithm: 'radial',
        direction: 'UNDEFINED',
        spacing: {
          nodeNode: 60,
          edgeEdge: 30
        }
      },
      
      // 清晰布局 - 解决节点重叠问题
      clear: {
        algorithm: 'layered',
        direction: 'DOWN',
        spacing: {
          nodeNodeBetweenLayers: 120,  // 非常大的间距
          edgeNodeBetweenLayers: 60,
          nodeNode: 80,
          edgeEdge: 40
        },
        layoutOptions: {
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.nodePlacement.strategy': 'SIMPLE',
          'elk.edge.routing': 'ORTHOGONAL',
          'elk.layered.unnecessaryBendpoints': 'true',
          'elk.spacing.portPort': '20',
          'elk.layered.thoroughness': '100'
        }
      }
    }

    return presets[preset] || presets.flowchart
  }
}