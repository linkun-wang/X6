/**
 * 流程图布局示例 - 专门展示横平竖直连线和节点中心对齐效果
 * 根据用户需求定制的流程图布局方案
 */
import React from 'react'
import { Button, Card, message, Space, Divider, Switch, InputNumber } from 'antd'
import { Graph } from '@antv/x6'
import { ElkLayoutProcessor } from '../../utils/ElkLayoutProcessor'
import '../index.less'

export default class FlowchartLayoutExample extends React.Component {
  constructor(props) {
    super(props)
    this.container = null
    this.graph = null
    
    this.state = {
      loading: false,
      useAnimation: true,
      animationDuration: 800,
      layerSpacing: 120,
      nodeSpacing: 100
    }
  }

  componentDidMount() {
    this.initGraph()
    this.createFlowchartData()
  }

  // 初始化图形
  initGraph = () => {
    this.graph = new Graph({
      container: this.container,
      width: 1200,
      height: 800,
      grid: {
        visible: true,
        size: 20,
        type: 'doubleMesh',
        args: [
          { color: '#E7E8EA', thickness: 1 },
          { color: '#CBCED3', thickness: 1 }
        ]
      },
      selecting: {
        enabled: true,
        rubberband: true
      },
      connecting: {
        anchor: 'center',
        connectionPoint: 'boundary'
      },
      background: {
        color: '#F8F9FA'
      },
      mousewheel: {
        enabled: true,
        zoomAtMousePosition: true,
        modifiers: 'ctrl',
        minScale: 0.3,
        maxScale: 2
      },
      panning: {
        enabled: true,
        modifiers: 'shift'
      }
    })
  }

  // 创建流程图数据 - 模拟您图片中的结构
  createFlowchartData = () => {
    const nodes = []
    const edges = []
    
    // 定义节点样式
    const nodeStyles = {
      start: { fill: '#e6f7ff', stroke: '#1890ff', strokeWidth: 2 },
      process: { fill: '#f6ffed', stroke: '#52c41a', strokeWidth: 2 },
      decision: { fill: '#fff7e6', stroke: '#fa8c16', strokeWidth: 2 },
      end: { fill: '#fff2f0', stroke: '#ff4d4f', strokeWidth: 2 },
      auto: { fill: '#f0f2ff', stroke: '#722ed1', strokeWidth: 2 }
    }
    
    // 创建节点 - 按您的图片结构
    const nodeData = [
      // 第一层：开始节点
      { id: 'start', x: 500, y: 50, width: 80, height: 40, label: '开始', type: 'start' },
      
      // 第二层：人工4
      { id: 'manual4', x: 500, y: 150, width: 100, height: 50, label: '👤 人工4', type: 'process' },
      
      // 第三层：三个并行节点
      { id: 'manual2', x: 200, y: 250, width: 100, height: 50, label: '👤 人工2', type: 'process' },
      { id: 'wait1', x: 500, y: 250, width: 100, height: 50, label: '⏳ 等待1', type: 'decision' },
      { id: 'auto1', x: 800, y: 250, width: 100, height: 50, label: '🔧 自动1', type: 'auto' },
      
      // 第四层：分支处理
      { id: 'decision2', x: 200, y: 350, width: 80, height: 40, label: '判断2', type: 'decision' },
      { id: 'wait2', x: 500, y: 350, width: 100, height: 50, label: '⏳ 等待2', type: 'decision' },
      
      // 第五层：更多处理
      { id: 'manual3', x: 100, y: 450, width: 100, height: 50, label: '👤 人工3', type: 'process' },
      { id: 'wait3', x: 500, y: 450, width: 100, height: 50, label: '⏳ 等待3', type: 'decision' },
      { id: 'decision7', x: 300, y: 450, width: 80, height: 40, label: '判断7', type: 'decision' },
      
      // 第六层：汇聚处理
      { id: 'wait4', x: 200, y: 550, width: 100, height: 50, label: '⏳ 等待4', type: 'decision' },
      { id: 'create1', x: 400, y: 550, width: 100, height: 50, label: '📝 创建1', type: 'auto' },
      
      // 第七层：结束
      { id: 'end', x: 300, y: 650, width: 80, height: 40, label: '结束2', type: 'end' }
    ]
    
    // 创建节点
    nodeData.forEach(data => {
      const node = this.graph.createNode({
        id: data.id,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        shape: 'rect',
        attrs: {
          body: {
            ...nodeStyles[data.type],
            rx: 6,
            ry: 6
          },
          label: {
            text: data.label,
            fill: '#333',
            fontSize: 12,
            fontWeight: 'bold'
          }
        }
      })
      nodes.push(node)
    })
    
    // 创建连线 - 模拟您图片中的连接关系
    const edgeData = [
      // 主流程线
      { source: 'start', target: 'manual4' },
      { source: 'manual4', target: 'manual2' },
      { source: 'manual4', target: 'wait1' },
      { source: 'manual4', target: 'auto1' },
      
      // 分支处理
      { source: 'manual2', target: 'decision2' },
      { source: 'wait1', target: 'wait2' },
      { source: 'wait2', target: 'wait3' },
      
      // 更多分支
      { source: 'decision2', target: 'manual3' },
      { source: 'decision2', target: 'decision7' },
      { source: 'wait3', target: 'decision7' },
      
      // 汇聚到处理节点
      { source: 'manual3', target: 'wait4' },
      { source: 'decision7', target: 'wait4' },
      { source: 'decision7', target: 'create1' },
      
      // 最终汇聚
      { source: 'wait4', target: 'end' },
      { source: 'create1', target: 'end' },
      
      // 回环连线
      { source: 'auto1', target: 'end' }
    ]
    
    // 创建边
    edgeData.forEach(data => {
      const edge = this.graph.createEdge({
        id: `edge_${data.source}_${data.target}`,
        source: data.source,
        target: data.target,
        attrs: {
          line: {
            stroke: '#666',
            strokeWidth: 2,
            targetMarker: {
              name: 'block',
              width: 8,
              height: 6,
              fill: '#666'
            }
          }
        },
        router: 'orthogonal', // 强制使用正交路由
        connector: 'rounded'   // 圆角连接
      })
      edges.push(edge)
    })
    
    this.graph.resetCells([...nodes, ...edges])
    console.log(`创建流程图示例：${nodes.length}个节点，${edges.length}条边`)
    
    // 初始化时居中显示
    setTimeout(() => {
      this.graph.zoomToFit({ padding: 40, maxScale: 0.8 })
    }, 100)
  }

  // 应用流程图专用布局
  applyFlowchartLayout = async () => {
    this.setState({ loading: true })
    
    try {
      const processor = new ElkLayoutProcessor()
      
      const layoutResult = await processor.applyFlowchartLayout(this.graph, {
        defaultNodeSize: { width: 100, height: 50 },
        animationDuration: this.state.useAnimation ? this.state.animationDuration : 0,
        elkConfig: {
          spacing: {
            nodeNodeBetweenLayers: this.state.layerSpacing,
            nodeNode: this.state.nodeSpacing,
            edgeNodeBetweenLayers: 60,
            edgeEdge: 30
          }
        }
      })
      
      message.success('🎉 流程图布局应用成功！连线横平竖直，节点中心对齐')
      
      // 自动调整视图
      setTimeout(() => {
        this.graph.zoomToFit({ padding: 50, maxScale: 1.0 })
      }, this.state.animationDuration + 200)
      
    } catch (error) {
      console.error('流程图布局失败:', error)
      message.error('流程图布局失败，请检查控制台错误信息')
    } finally {
      this.setState({ loading: false })
    }
  }

  // 重置为原始随机布局
  resetLayout = () => {
    this.createFlowchartData()
    message.info('已重置为原始布局')
  }

  refContainer = (container) => {
    this.container = container
  }

  render() {
    return (
      <div className="x6-graph-wrap" style={{ padding: 24 }}>
        <Card title="📊 流程图专用布局 - 横平竖直连线示例" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 6, border: '1px solid #bae7ff' }}>
            <strong>🎯 布局目标：</strong>
            <span style={{ marginLeft: 8, color: '#666' }}>
              实现连线横平竖直、节点中心对齐、允许连线部分重叠的标准流程图效果
            </span>
          </div>
          
          <Space wrap size="large">
            <Button 
              type="primary" 
              size="large"
              onClick={this.applyFlowchartLayout}
              loading={this.state.loading}
              style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
            >
              🚀 应用流程图布局
            </Button>
            
            <Button onClick={this.resetLayout}>
              🔄 重置布局
            </Button>
            
            <Divider type="vertical" style={{ height: 40 }} />
            
            <div>
              <span>动画效果：</span>
              <Switch
                checked={this.state.useAnimation}
                onChange={(checked) => this.setState({ useAnimation: checked })}
                style={{ marginLeft: 8 }}
              />
            </div>
            
            {this.state.useAnimation && (
              <div>
                <span>动画时长：</span>
                <InputNumber
                  min={200}
                  max={2000}
                  step={100}
                  value={this.state.animationDuration}
                  onChange={(value) => this.setState({ animationDuration: value })}
                  style={{ width: 80, marginLeft: 8 }}
                />
                <span style={{ marginLeft: 4 }}>ms</span>
              </div>
            )}
            
            <Divider type="vertical" style={{ height: 40 }} />
            
            <div>
              <span>层间距：</span>
              <InputNumber
                min={60}
                max={200}
                step={10}
                value={this.state.layerSpacing}
                onChange={(value) => this.setState({ layerSpacing: value })}
                style={{ width: 80, marginLeft: 8 }}
              />
            </div>
            
            <div>
              <span>节点间距：</span>
              <InputNumber
                min={50}
                max={150}
                step={10}
                value={this.state.nodeSpacing}
                onChange={(value) => this.setState({ nodeSpacing: value })}
                style={{ width: 80, marginLeft: 8 }}
              />
            </div>
          </Space>
        </Card>
        
        <div
          ref={this.refContainer}
          className="x6-graph"
          style={{
            border: '2px solid #d9d9d9',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            backgroundColor: '#fff'
          }}
        />
        
        <Card style={{ marginTop: 16 }} size="small">
          <div style={{ fontSize: 12, color: '#666' }}>
            <strong>🔧 核心特性：</strong>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li><strong>横平竖直连线</strong>：使用 ORTHOGONAL 正交路由，确保所有连线都是直角</li>
              <li><strong>节点中心对齐</strong>：同层节点自动按中心线对齐，形成整齐的布局</li>
              <li><strong>允许连线重叠</strong>：合理利用空间，连线可以部分重叠而不影响可读性</li>
              <li><strong>智能间距</strong>：自动计算最佳的节点和连线间距</li>
              <li><strong>动画过渡</strong>：支持平滑的布局变换动画</li>
            </ul>
            <div style={{ marginTop: 12 }}>
              <strong>💡 操作提示：</strong> Ctrl+滚轮缩放，Shift+拖拽平移，点击节点可选中
            </div>
          </div>
        </Card>
      </div>
    )
  }
}