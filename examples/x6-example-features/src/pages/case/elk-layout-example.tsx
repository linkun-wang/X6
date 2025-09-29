/**
 * ELK布局使用示例
 * 展示如何在X6项目中集成和使用ELK自动布局
 */
import React from 'react'
import { Button, Select, Card, message, Space, Divider } from 'antd'
import { Graph, Node, Edge } from '@antv/x6'
import { ElkLayoutProcessor } from '../../utils/ElkLayoutProcessor'
import '../index.less'

const { Option } = Select

// 示例节点数据
const createSampleNodes = (): Node[] => {
  const graph = new Graph({ container: document.createElement('div') })
  
  return [
    graph.createNode({
      id: 'start',
      x: 50,
      y: 50,
      width: 100,
      height: 40,
      label: '开始',
      attrs: {
        body: { fill: '#e8f5e8', stroke: '#52c41a' },
        label: { text: '开始' }
      }
    }),
    graph.createNode({
      id: 'process1',
      x: 200,
      y: 100,
      width: 120,
      height: 40,
      label: '数据处理',
      attrs: {
        body: { fill: '#e6f7ff', stroke: '#1890ff' },
        label: { text: '数据处理' }
      }
    }),
    graph.createNode({
      id: 'decision',
      x: 350,
      y: 150,
      width: 100,
      height: 40,
      label: '条件判断',
      attrs: {
        body: { fill: '#fff7e6', stroke: '#fa8c16' },
        label: { text: '条件判断' }
      }
    }),
    graph.createNode({
      id: 'process2a',
      x: 250,
      y: 250,
      width: 100,
      height: 40,
      label: '分支A',
      attrs: {
        body: { fill: '#f6ffed', stroke: '#52c41a' },
        label: { text: '分支A' }
      }
    }),
    graph.createNode({
      id: 'process2b',
      x: 450,
      y: 250,
      width: 100,
      height: 40,
      label: '分支B',
      attrs: {
        body: { fill: '#f6ffed', stroke: '#52c41a' },
        label: { text: '分支B' }
      }
    }),
    graph.createNode({
      id: 'end',
      x: 350,
      y: 350,
      width: 100,
      height: 40,
      label: '结束',
      attrs: {
        body: { fill: '#fff2f0', stroke: '#ff4d4f' },
        label: { text: '结束' }
      }
    })
  ]
}

// 示例边数据
const createSampleEdges = (): Edge[] => {
  const graph = new Graph({ container: document.createElement('div') })
  
  return [
    graph.createEdge({
      id: 'edge1',
      source: 'start',
      target: 'process1',
      attrs: {
        line: { stroke: '#666', strokeWidth: 2, targetMarker: { name: 'block' } }
      }
    }),
    graph.createEdge({
      id: 'edge2',
      source: 'process1',
      target: 'decision',
      attrs: {
        line: { stroke: '#666', strokeWidth: 2, targetMarker: { name: 'block' } }
      }
    }),
    graph.createEdge({
      id: 'edge3',
      source: 'decision',
      target: 'process2a',
      label: '是',
      attrs: {
        line: { stroke: '#52c41a', strokeWidth: 2, targetMarker: { name: 'block' } }
      }
    }),
    graph.createEdge({
      id: 'edge4',
      source: 'decision',
      target: 'process2b',
      label: '否',
      attrs: {
        line: { stroke: '#ff4d4f', strokeWidth: 2, targetMarker: { name: 'block' } }
      }
    }),
    graph.createEdge({
      id: 'edge5',
      source: 'process2a',
      target: 'end',
      attrs: {
        line: { stroke: '#666', strokeWidth: 2, targetMarker: { name: 'block' } }
      }
    }),
    graph.createEdge({
      id: 'edge6',
      source: 'process2b',
      target: 'end',
      attrs: {
        line: { stroke: '#666', strokeWidth: 2, targetMarker: { name: 'block' } }
      }
    })
  ]
}

export default class ElkLayoutExample extends React.Component {
  private container: HTMLDivElement
  private graph: Graph
  
  state = {
    algorithm: 'layered' as 'layered' | 'force' | 'stress' | 'mrtree' | 'radial',
    direction: 'DOWN' as 'DOWN' | 'UP' | 'LEFT' | 'RIGHT',
    loading: false
  }

  componentDidMount() {
    this.initGraph()
    this.loadSampleData()
  }

  // 初始化图形
  initGraph = () => {
    this.graph = new Graph({
      container: this.container,
      width: 800,
      height: 600,
      grid: {
        visible: true,
        size: 10,
        type: 'doubleMesh'
      },
      selecting: {
        enabled: true,
        rubberband: true
      },
      connecting: {
        anchor: 'center',
        connectionPoint: 'boundary'
      }
    })
  }

  // 加载示例数据
  loadSampleData = () => {
    const nodes = createSampleNodes()
    const edges = createSampleEdges()
    
    this.graph.resetCells([...nodes, ...edges])
    this.graph.zoomToFit({ padding: 20 })
  }

  // 应用流程图专用布局
  applyFlowchartLayout = async () => {
    this.setState({ loading: true })
    
    try {
      const elkProcessor = new ElkLayoutProcessor()
      
      const layoutResult = await elkProcessor.applyFlowchartLayout(
        this.graph,
        {
          animationDuration: 600,
          elkConfig: {
            spacing: {
              nodeNodeBetweenLayers: 100,
              nodeNode: 80
            }
          }
        }
      )
      
      console.log('流程图专用布局结果:', layoutResult)
      message.success(`🎉 流程图布局完成！连线横平竖直，节点中心对齐。节点：${layoutResult.nodes.length}，边：${layoutResult.edges.length}`)
      
      // 自动调整视图
      setTimeout(() => {
        this.graph.zoomToFit({ padding: 40, maxScale: 1.2 })
      }, 700)
      
    } catch (error) {
      console.error('流程图布局失败:', error)
      message.error('流程图布局失败，请检查控制台错误信息')
    } finally {
      this.setState({ loading: false })
    }
  }

  // 应用ELK布局
  applyElkLayout = async () => {
    this.setState({ loading: true })
    
    try {
      const nodes = this.graph.getNodes()
      const edges = this.graph.getEdges()
      
      if (nodes.length === 0) {
        message.warning('没有节点可以进行布局')
        return
      }

      // 创建ELK布局处理器
      const elkProcessor = new ElkLayoutProcessor({
        algorithm: this.state.algorithm,
        direction: this.state.direction,
        spacing: {
          nodeNodeBetweenLayers: 60,
          edgeNodeBetweenLayers: 30,
          nodeNode: 40,
          edgeEdge: 20
        },
        useWorker: true
      })
      
      // 应用布局
      const layoutResult = await elkProcessor.applyLayoutToGraph(
        this.graph,
        {
          defaultNodeSize: { width: 120, height: 50 },
          autoCalculateSize: true,
          edgeRouting: 'ORTHOGONAL'
        },
        500 // 动画时长
      )
      
      console.log('ELK布局结果:', layoutResult)
      message.success(`布局完成！节点：${layoutResult.nodes.length}，边：${layoutResult.edges.length}`)
      
      // 自动调整视图
      setTimeout(() => {
        this.graph.zoomToFit({ padding: 30, maxScale: 1.5 })
      }, 600)
      
    } catch (error) {
      console.error('ELK布局失败:', error)
      message.error('布局失败，请检查控制台错误信息')
    } finally {
      this.setState({ loading: false })
    }
  }

  // 应用预设布局
  applyPresetLayout = async (preset: 'flowchart' | 'hierarchy' | 'network' | 'circular' | 'clear') => {
    this.setState({ loading: true })
    
    try {
      const elkConfig = ElkLayoutProcessor.createPresetConfig(preset)
      const elkProcessor = new ElkLayoutProcessor(elkConfig)
      
      await elkProcessor.applyLayoutToGraph(
        this.graph,
        { autoCalculateSize: true },
        400
      )
      
      message.success(`${preset}布局应用成功！`)
      
      setTimeout(() => {
        this.graph.zoomToFit({ padding: 20, maxScale: 1.5 })
      }, 500)
      
    } catch (error) {
      console.error(`${preset}布局失败:`, error)
      message.error(`${preset}布局失败`)
    } finally {
      this.setState({ loading: false })
    }
  }

  // 添加随机节点
  addRandomNodes = () => {
    const nodeCount = 5
    const newNodes: Node[] = []
    const newEdges: Edge[] = []
    
    for (let i = 0; i < nodeCount; i++) {
      const node = this.graph.createNode({
        id: `random-${Date.now()}-${i}`,
        x: Math.random() * 600,
        y: Math.random() * 400,
        width: 100,
        height: 40,
        label: `节点${i + 1}`,
        attrs: {
          body: { 
            fill: `hsl(${Math.random() * 360}, 70%, 85%)`,
            stroke: `hsl(${Math.random() * 360}, 70%, 60%)`
          }
        }
      })
      newNodes.push(node)
      
      // 随机连接到已存在的节点
      if (i > 0) {
        const edge = this.graph.createEdge({
          id: `random-edge-${Date.now()}-${i}`,
          source: newNodes[i - 1].id,
          target: node.id,
          attrs: {
            line: { stroke: '#666', strokeWidth: 1, targetMarker: { name: 'block' } }
          }
        })
        newEdges.push(edge)
      }
    }
    
    this.graph.resetCells([...newNodes, ...newEdges])
    message.success(`添加了${nodeCount}个随机节点`)
  }

  refContainer = (container: HTMLDivElement) => {
    this.container = container
  }

  render() {
    return (
      <div className="x6-graph-wrap" style={{ padding: 24 }}>
        <Card title="ELK自动布局示例" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 6, border: '1px solid #bae7ff' }}>
            <strong>📊 新增流程图专用布局：</strong>
            <span style={{ marginLeft: 8, color: '#666' }}>
              专门针对流程图优化，实现连线横平竖直、节点中心对齐、允许连线重叠的标准效果
            </span>
          </div>
          <Space wrap>
            {/* 流程图专用布局 */}
            <Button 
              type="primary" 
              onClick={this.applyFlowchartLayout}
              loading={this.state.loading}
              size="large"
              style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
            >
              🚀 流程图专用布局
            </Button>
            
            <Divider type="vertical" />
            
            <span>布局算法：</span>
            <Select
              value={this.state.algorithm}
              onChange={(value) => this.setState({ algorithm: value })}
              style={{ width: 120 }}
            >
              <Option value="layered">分层布局</Option>
              <Option value="force">力导向布局</Option>
              <Option value="stress">应力布局</Option>
              <Option value="mrtree">树形布局</Option>
              <Option value="radial">径向布局</Option>
            </Select>
            
            <span>布局方向：</span>
            <Select
              value={this.state.direction}
              onChange={(value) => this.setState({ direction: value })}
              style={{ width: 80 }}
            >
              <Option value="DOWN">下</Option>
              <Option value="UP">上</Option>
              <Option value="LEFT">左</Option>
              <Option value="RIGHT">右</Option>
            </Select>
            
            <Button 
              type="primary" 
              onClick={this.applyElkLayout}
              loading={this.state.loading}
            >
              应用布局
            </Button>
            
            <Divider type="vertical" />
            
            <span>预设布局：</span>
            <Button onClick={() => this.applyPresetLayout('clear')}>✨ 清晰布局</Button>
            <Button onClick={() => this.applyPresetLayout('flowchart')}>📊 流程图</Button>
            <Button onClick={() => this.applyPresetLayout('hierarchy')}>🌳 层次结构</Button>
            <Button onClick={() => this.applyPresetLayout('network')}>🕸️ 网络图</Button>
            <Button onClick={() => this.applyPresetLayout('circular')}>⚪ 圆形布局</Button>
            
            <Divider type="vertical" />
            
            <Button onClick={this.loadSampleData}>重置示例</Button>
            <Button onClick={this.addRandomNodes}>添加随机节点</Button>
          </Space>
        </Card>
        
        <div
          ref={this.refContainer}
          className="x6-graph"
          style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        />
      </div>
    )
  }
}