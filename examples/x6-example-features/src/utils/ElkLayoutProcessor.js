/**
 * ELK布局处理器 - 用于X6流程图的自动布局
 * 支持多种布局算法和自定义配置
 * JavaScript版本 - 适配elkjs 0.11.0
 */
// elkjs 0.11.0 新的导入方式
import ELK from 'elkjs'

/**
 * ELK布局处理器类
 */
export class ElkLayoutProcessor {
  /**
   * 构造函数
   * @param {Object} config - 布局配置选项
   * @param {string} [config.algorithm='layered'] - 布局算法类型: 'layered' | 'force' | 'stress' | 'mrtree' | 'radial'
   * @param {string} [config.direction='DOWN'] - 布局方向: 'UNDEFINED' | 'RIGHT' | 'LEFT' | 'DOWN' | 'UP'
   * @param {Object} [config.spacing] - 节点间距配置
   * @param {number} [config.spacing.nodeNodeBetweenLayers=25] - 层间节点间距
   * @param {number} [config.spacing.edgeNodeBetweenLayers=15] - 层间边节点间距
   * @param {number} [config.spacing.nodeNode=20] - 节点间距
   * @param {number} [config.spacing.edgeEdge=15] - 边间距
   * @param {boolean} [config.useWorker=true] - 是否使用Web Worker
   * @param {string} [config.workerUrl] - 自定义Worker URL（可选）
   * @param {Object} [config.layoutOptions={}] - 自定义布局选项
   */
  constructor(config = {}) {
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

    // 初始化ELK实例 - 适配elkjs 0.11.0，简化配置避免兼容性问题
    if (this.config.useWorker) {
      try {
        if (config.workerUrl) {
          // 使用用户指定的worker URL
          this.elk = new ELK({ workerUrl: config.workerUrl })
          console.log('使用指定的Web Worker路径:', config.workerUrl)
        } else {
          // 让elkjs自动处理worker路径，避免import.meta.url兼容性问题
          this.elk = new ELK()
          console.log('使用ELK默认Web Worker配置')
        }
      } catch (error) {
        console.warn('Web Worker 初始化失败，使用同步模式:', error)
        this.elk = new ELK()
        this.config.useWorker = false // 更新配置状态
      }
    } else {
      this.elk = new ELK()
      console.log('使用同步模式（未启用Web Worker）')
    }
  }

  /**
   * 将X6图形数据转换为ELK布局数据格式
   * @param {Array} nodes - X6节点数组
   * @param {Array} edges - X6边数组
   * @param {Object} options - 转换选项
   * @param {Object} [options.defaultNodeSize={ width: 80, height: 40 }] - 节点默认尺寸
   * @param {boolean} [options.autoCalculateSize=true] - 是否自动计算节点尺寸
   * @param {string} [options.edgeRouting='ORTHOGONAL'] - 边的路由类型: 'ORTHOGONAL' | 'POLYLINE' | 'SPLINES'
   * @param {boolean} [options.preserveNodeData=true] - 是否保留原始节点数据
   * @returns {Object} ELK格式的图形数据
   */
  convertX6ToElk(nodes, edges, options = {}) {
    const opts = {
      defaultNodeSize: { width: 80, height: 40 },
      autoCalculateSize: true,
      edgeRouting: 'ORTHOGONAL',
      preserveNodeData: true,
      ...options
    }

    // 转换节点
    const elkNodes = nodes.map(node => {
      const size = node.getSize()
      
      // 自动计算或使用默认尺寸
      const width = opts.autoCalculateSize && size.width > 0 
        ? size.width 
        : opts.defaultNodeSize.width
      const height = opts.autoCalculateSize && size.height > 0 
        ? size.height 
        : opts.defaultNodeSize.height

      const elkNode = {
        id: node.id,
        width,
        height,
        // 保留原始数据用于后续处理
        ...(opts.preserveNodeData && { x6Data: node.toJSON() })
      }

      // 添加标签信息
      const nodeData = node.toJSON()
      const labelText = nodeData.label || 
                       (nodeData.attrs && nodeData.attrs.text && nodeData.attrs.text.text) || 
                       (nodeData.attrs && nodeData.attrs.label && nodeData.attrs.label.text)
      if (labelText) {
        elkNode.labels = [{ id: `${node.id}-label`, text: labelText }]
      }

      return elkNode
    })

    // 转换边
    const elkEdges = edges.map(edge => {
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
    const elkGraph = {
      id: 'root',
      layoutOptions: this.buildLayoutOptions(opts),
      children: elkNodes,
      edges: elkEdges
    }

    return elkGraph
  }

  /**
   * 构建ELK布局选项
   * @param {Object} options - X6转换选项
   * @returns {Object} ELK布局选项
   * @private
   */
  buildLayoutOptions(options) {
    const spacing = this.config.spacing
    const layoutOptions = {
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
   * @param {Array} nodes - X6节点数组
   * @param {Array} edges - X6边数组
   * @param {Object} options - 转换选项
   * @returns {Promise<Object>} 布局结果
   */
  async performLayout(nodes, edges, options = {}) {
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
   * @param {Object} elkResult - ELK布局结果
   * @param {Array} originalNodes - 原始节点数组
   * @param {Array} originalEdges - 原始边数组
   * @returns {Object} X6格式的布局结果
   * @private
   */
  convertElkToX6(elkResult, originalNodes, originalEdges) {
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
      const sections = elkEdge.sections || []
      const vertices = sections.length > 0 ? sections[0].bendPoints || [] : []
      
      // 获取源和目标节点ID
      const sourceId = (elkEdge.sources && elkEdge.sources[0]) || ''
      const targetId = (elkEdge.targets && elkEdge.targets[0]) || ''

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
   * 应用布局结果到X6图形
   * @param {Object} graph - X6 Graph实例
   * @param {Object} layoutOptions - 布局选项
   * @param {number} [animationDuration=300] - 动画持续时间(毫秒)
   * @returns {Promise<Object>} 布局结果
   */
  async applyLayoutToGraph(graph, layoutOptions = {}, animationDuration = 300) {
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
   * 专门的流程图布局 - 实现连线横平竖直、节点中心对齐
   * @param {Object} graph - X6 Graph实例
   * @param {Object} options - 流程图优化选项
   * @returns {Promise<Object>} 布局结果
   */
  async applyFlowchartLayout(graph, options = {}) {
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
    const flowchartConfig = {
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
    const mergedConfig = {
      ...flowchartConfig,
      ...options.elkConfig,
      layoutOptions: {
        ...flowchartConfig.layoutOptions,
        ...(options.elkConfig && options.elkConfig.layoutOptions)
      }
    }
    
    // 创建优化的布局处理器
    const elkProcessor = new ElkLayoutProcessor(mergedConfig)
    
    // 布局选项
    const layoutOptions = {
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
   * 智能布局优化 - 根据图形特点自动选择最优布局
   * @param {Object} graph - X6 Graph实例
   * @param {Object} options - 优化选项
   * @returns {Promise<Object>} 布局结果
   */
  async smartLayout(graph, options = {}) {
    const nodes = graph.getNodes()
    const edges = graph.getEdges()
    
    if (nodes.length === 0) {
      console.warn('没有节点需要布局')
      return { nodes: [], edges: [], layoutSize: { width: 0, height: 0 } }
    }
    
    // 分析图形特征
    const nodeCount = nodes.length
    const edgeCount = edges.length
    const density = edgeCount / (nodeCount * (nodeCount - 1) / 2) // 边密度
    
    // 计算最大度数（连接数）
    const degreeMap = new Map()
    edges.forEach(edge => {
      const source = edge.getSourceCellId()
      const target = edge.getTargetCellId()
      degreeMap.set(source, (degreeMap.get(source) || 0) + 1)
      degreeMap.set(target, (degreeMap.get(target) || 0) + 1)
    })
    const maxDegree = Math.max(...degreeMap.values(), 0)
    
    // 智能选择布局算法和参数
    let layoutConfig
    let layoutOptions = {
      defaultNodeSize: { width: 120, height: 50 },
      autoCalculateSize: true,
      edgeRouting: 'ORTHOGONAL',
      ...options
    }
    
    if (nodeCount <= 10 && density < 0.3) {
      // 小规模、低密度：使用清晰布局
      layoutConfig = ElkLayoutProcessor.createPresetConfig('clear')
      console.log('选择清晰布局（小规模、低密度）')
    } else if (nodeCount <= 20 && maxDegree <= 3) {
      // 中规模、低连接数：使用流程图布局
      layoutConfig = ElkLayoutProcessor.createPresetConfig('flowchart')
      console.log('选择流程图布局（中规模、线性结构）')
    } else if (density > 0.5 || maxDegree > 5) {
      // 高密度或高连接数：使用力导向布局
      layoutConfig = ElkLayoutProcessor.createPresetConfig('network')
      layoutOptions.edgeRouting = 'SPLINES' // 曲线边减少混乱
      console.log('选择网络布局（高密度、复杂连接）')
    } else if (nodeCount > 30) {
      // 大规模：使用紧凑布局
      layoutConfig = ElkLayoutProcessor.createPresetConfig('compact')
      console.log('选择紧凑布局（大规模图形）')
    } else {
      // 默认：层次布局
      layoutConfig = ElkLayoutProcessor.createPresetConfig('hierarchy')
      console.log('选择层次布局（默认选项）')
    }
    
    // 动态调整间距（根据节点数量）
    const spacingMultiplier = Math.max(1, Math.min(2, nodeCount / 15))
    if (layoutConfig.spacing) {
      Object.keys(layoutConfig.spacing).forEach(key => {
        layoutConfig.spacing[key] = Math.round(layoutConfig.spacing[key] * spacingMultiplier)
      })
    }
    
    console.log('智能布局分析:', {
      nodeCount,
      edgeCount,
      density: density.toFixed(3),
      maxDegree,
      spacingMultiplier: spacingMultiplier.toFixed(2),
      selectedConfig: layoutConfig
    })
    
    // 创建优化的布局处理器
    const elkProcessor = new ElkLayoutProcessor(layoutConfig)
    
    // 应用布局
    return await elkProcessor.applyLayoutToGraph(
      graph,
      layoutOptions,
      Math.min(800, nodeCount * 20) // 动态调整动画时间
    )
  }

  /**
   * 检查Web Worker状态
   * @returns {Object} Worker状态信息
   */
  getWorkerStatus() {
    return {
      isWorkerEnabled: this.config.useWorker,
      hasWorkerSupport: typeof Worker !== 'undefined',
      elkInstance: !!this.elk,
      workerInfo: this.elk && this.elk.worker ? 'Worker已创建' : '使用同步模式'
    }
  }

  /**
   * 创建预设布局配置
   * @param {string} preset - 预设类型: 'flowchart' | 'hierarchy' | 'network' | 'circular'
   * @returns {Object} 布局配置对象
   * @static
   */
  static createPresetConfig(preset) {
    const presets = {
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
      
      // 层次结构布局 - 适合组织架构图，更大间距
      hierarchy: {
        algorithm: 'mrtree',
        direction: 'DOWN',
        spacing: {
          nodeNodeBetweenLayers: 100,  // 更大的层间间距
          edgeNodeBetweenLayers: 50,
          nodeNode: 60,
          edgeEdge: 30
        },
        layoutOptions: {
          'elk.mrtree.searchOrder': 'DFS',
          'elk.edge.routing': 'POLYLINE'
        }
      },
      
      // 网络布局 - 适合网络拓扑图，使用力导向算法
      network: {
        algorithm: 'force',
        direction: 'UNDEFINED',
        spacing: {
          nodeNode: 80,     // 增大节点间距避免重叠
          edgeEdge: 40
        },
        layoutOptions: {
          'elk.force.repulsion': '200.0',
          'elk.force.attraction': '0.1',
          'elk.force.iterations': '300',
          'elk.edge.routing': 'SPLINES'
        }
      },
      
      // 圆形布局 - 适合关系图，优化半径和间距
      circular: {
        algorithm: 'radial',
        direction: 'UNDEFINED',
        spacing: {
          nodeNode: 100,    // 更大的节点间距
          edgeEdge: 50
        },
        layoutOptions: {
          'elk.radial.radius': '150.0',
          'elk.radial.compaction': 'true',
          'elk.edge.routing': 'SPLINES'
        }
      },
      
      // 新增：紧凑布局 - 适合节点较多的情况
      compact: {
        algorithm: 'layered',
        direction: 'RIGHT',  // 水平布局更紧凑
        spacing: {
          nodeNodeBetweenLayers: 40,
          edgeNodeBetweenLayers: 20,
          nodeNode: 30,
          edgeEdge: 15
        },
        layoutOptions: {
          'elk.layered.compaction.connectedComponents': 'true',
          'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
          'elk.edge.routing': 'ORTHOGONAL'
        }
      },
      
      // 新增：清晰布局 - 优先考虑可读性
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

// 使用示例：
/*
// === 流程图专用布局（推荐用于您的场景）===
import { ElkLayoutProcessor } from './ElkLayoutProcessor.js'

// 创建处理器
const processor = new ElkLayoutProcessor()

// 应用流程图专用布局 - 实现连线横平竖直、节点中心对齐
processor.applyFlowchartLayout(graph, {
  defaultNodeSize: { width: 120, height: 50 },
  animationDuration: 600,
  elkConfig: {
    // 可以进一步调整间距
    spacing: {
      nodeNodeBetweenLayers: 120, // 层间距离
      nodeNode: 100               // 同层节点间距
    }
  }
})
  .then(result => {
    console.log('流程图布局完成！', result)
    // 自动调整视图
    graph.zoomToFit({ padding: 40, maxScale: 1.2 })
  })
  .catch(error => {
    console.error('流程图布局失败:', error)
  })

// === 基础使用 ===
// 创建布局处理器
const processor = new ElkLayoutProcessor({
  algorithm: 'layered',
  direction: 'DOWN',
  useWorker: true
})

// 应用布局到图形
processor.applyLayoutToGraph(graph)
  .then(result => {
    console.log('布局完成:', result)
  })
  .catch(error => {
    console.error('布局失败:', error)
  })

// === 智能布局（自动选择）===
// 自动分析图形特征并选择最优布局
const processor = new ElkLayoutProcessor()
processor.smartLayout(graph, {
  defaultNodeSize: { width: 120, height: 50 },
  autoCalculateSize: true
})
  .then(result => {
    console.log('智能布局完成:', result)
    // 自动调整视图
    graph.zoomToFit({ padding: 30, maxScale: 1.5 })
  })

// === 预设配置使用 ===
// 流程图布局（现在已优化）
const flowchartProcessor = new ElkLayoutProcessor(
  ElkLayoutProcessor.createPresetConfig('flowchart')
)

// 清晰布局（推荐用于重叠问题）
const clearProcessor = new ElkLayoutProcessor(
  ElkLayoutProcessor.createPresetConfig('clear')
)

// 紧凑布局（适合节点较多的情况）
const compactProcessor = new ElkLayoutProcessor(
  ElkLayoutProcessor.createPresetConfig('compact')
)

// === 手动布局计算 ===
const nodes = graph.getNodes()
const edges = graph.getEdges()
processor.performLayout(nodes, edges, {
  defaultNodeSize: { width: 100, height: 40 },
  autoCalculateSize: true,
  edgeRouting: 'ORTHOGONAL'
})
  .then(result => {
    // 手动处理布局结果
    result.nodes.forEach(nodeResult => {
      const node = nodeResult.originalNode
      if (node) {
        node.position(nodeResult.x, nodeResult.y)
      }
    })
    
    // 应用边的路径点
    result.edges.forEach(edgeResult => {
      const edge = edgeResult.originalEdge
      if (edge && edgeResult.vertices && edgeResult.vertices.length > 0) {
        edge.setVertices(edgeResult.vertices)
      }
    })
  })

// === 流程图布局的核心特点 ===
// 1. 连线横平竖直：使用 ORTHOGONAL 边路由
// 2. 节点中心对齐：配置 alignment 和 nodePlacement 策略
// 3. 允许连线重叠：设置 mergeEdges: 'false'
// 4. 减少不必要的弯点：启用 unnecessaryBendpoints
// 5. 更大的间距：保证布局清晰

// === 解决布局问题的建议 ===
// 1. 节点重叠问题：使用 applyFlowchartLayout() 或 'clear' 预设
// 2. 连线不直问题：确保使用 'ORTHOGONAL' 边路由
// 3. 布局太密集：增大 spacing 配置中的间距值
// 4. 性能问题：启用 useWorker: true

// === Worker 状态检查 ===
const status = processor.getWorkerStatus()
console.log('Worker 状态:', status)
// 输出：{ isWorkerEnabled: true, hasWorkerSupport: true, elkInstance: true, workerInfo: "Worker已创建" }
*/