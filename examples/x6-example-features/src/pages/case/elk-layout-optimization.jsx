/**
 * ELK布局优化示例 - 解决布局难看问题
 * 展示智能布局和各种优化策略
 */
import React from 'react'
import { Button, Select, Card, message, Space, Divider, Slider, Switch, Alert } from 'antd'
import { Graph, Node, Edge } from '@antv/x6'
import { ElkLayoutProcessor } from '../../utils/ElkLayoutProcessor'
import '../index.less'

const { Option } = Select

export default class ElkLayoutOptimization extends React.Component {
  constructor(props) {
    super(props)
    this.container = null
    this.graph = null
    
    this.state = {
      loading: false,
      currentPreset: 'smart',
      customSpacing: {
        nodeNode: 50,
        nodeNodeBetweenLayers: 80,
        edgeNodeBetweenLayers: 40,
        edgeEdge: 25
      },
      edgeRouting: 'ORTHOGONAL',
      useAnimation: true,
      animationDuration: 500
    }
  }

  componentDidMount() {
    this.initGraph()
    this.loadComplexSampleData()
  }

  // 初始化图形
  initGraph = () => {
    this.graph = new Graph({
      container: this.container,
      width: 1000,
      height: 700,
      grid: {
        visible: true,
        size: 15,
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
        connectionPoint: 'boundary',
        allowBlank: false,
        allowLoop: false,
        allowNode: false,
        allowEdge: false
      },
      background: {
        color: '#F8F9FA'
      },
      mousewheel: {
        enabled: true,
        zoomAtMousePosition: true,
        modifiers: 'ctrl',
        minScale: 0.5,
        maxScale: 3
      },
      panning: {
        enabled: true,
        modifiers: 'shift'
      }
    })
  }

  // 创建复杂的示例数据来展示布局问题
  loadComplexSampleData = () => {
    const nodes = []
    const edges = []
    
    // 创建多层级的复杂图形
    const nodeGroups = [
      { prefix: 'start', count: 2, label: '开始', color: '#e8f5e8', stroke: '#52c41a' },
      { prefix: 'input', count: 4, label: '输入', color: '#e6f7ff', stroke: '#1890ff' },
      { prefix: 'process', count: 6, label: '处理', color: '#fff7e6', stroke: '#fa8c16' },
      { prefix: 'decision', count: 3, label: '判断', color: '#f6ffed', stroke: '#52c41a' },
      { prefix: 'output', count: 5, label: '输出', color: '#fff2f0', stroke: '#ff4d4f' },
      { prefix: 'end', count: 2, label: '结束', color: '#f9f0ff', stroke: '#722ed1' }
    ]
    
    // 创建节点
    nodeGroups.forEach((group, groupIndex) => {
      for (let i = 0; i < group.count; i++) {
        const node = this.graph.createNode({
          id: `${group.prefix}_${i}`,
          x: Math.random() * 800,
          y: Math.random() * 500,
          width: 100 + Math.random() * 50,
          height: 40 + Math.random() * 20,
          label: `${group.label}${i + 1}`,
          attrs: {
            body: { 
              fill: group.color, 
              stroke: group.stroke,
              strokeWidth: 2,
              rx: 6,
              ry: 6
            },
            label: { 
              text: `${group.label}${i + 1}`,
              fill: '#333',
              fontSize: 12,
              fontWeight: 'bold'
            }
          }
        })
        nodes.push(node)
      }
    })
    
    // 创建边 - 模拟复杂的连接关系
    const createEdge = (sourceId, targetId, label = '') => {
      return this.graph.createEdge({
        id: `edge_${sourceId}_${targetId}`,
        source: sourceId,
        target: targetId,
        label,
        attrs: {
          line: { 
            stroke: '#666', 
            strokeWidth: 2, 
            targetMarker: { 
              name: 'block',
              width: 8,
              height: 6
            }
          },
          ...(label && {
            text: {
              text: label,
              fill: '#666',
              fontSize: 10
            }
          })
        }
      })
    }
    
    // 顺序连接各组
    for (let groupIndex = 0; groupIndex < nodeGroups.length - 1; groupIndex++) {
      const currentGroup = nodeGroups[groupIndex]
      const nextGroup = nodeGroups[groupIndex + 1]
      
      for (let i = 0; i < currentGroup.count; i++) {
        for (let j = 0; j < Math.min(2, nextGroup.count); j++) {
          const targetIndex = (i + j) % nextGroup.count
          edges.push(createEdge(
            `${currentGroup.prefix}_${i}`,
            `${nextGroup.prefix}_${targetIndex}`,
            groupIndex === 2 ? (j === 0 ? '是' : '否') : ''
          ))
        }
      }
    }
    
    // 添加一些环形连接增加复杂性
    edges.push(createEdge('process_0', 'input_2', '回环'))
    edges.push(createEdge('decision_1', 'process_3', '重试'))
    edges.push(createEdge('output_2', 'decision_0', '验证'))
    
    this.graph.resetCells([...nodes, ...edges])
    console.log(`创建了复杂示例：${nodes.length}个节点，${edges.length}条边`)
    
    // 初始化时居中显示
    setTimeout(() => {
      this.graph.zoomToFit({ padding: 20, maxScale: 1 })
    }, 100)
  }

  // 应用流程图专用布局
  applyFlowchartLayout = async () => {
    this.setState({ loading: true })
    
    try {
      const processor = new ElkLayoutProcessor()
      
      const layoutResult = await processor.applyFlowchartLayout(this.graph, {
        defaultNodeSize: { width: 120, height: 50 },
        animationDuration: this.state.useAnimation ? this.state.animationDuration : 0,
        elkConfig: {
          spacing: {
            nodeNodeBetweenLayers: 120,
            nodeNode: 100,
            edgeNodeBetweenLayers: 60,
            edgeEdge: 30
          }
        }
      })
      
      message.success('流程图专用布局应用成功！连线横平竖直，节点中心对齐')
      
      // 自动调整视图
      setTimeout(() => {
        this.graph.zoomToFit({ padding: 50, maxScale: 1.0 })
      }, this.state.animationDuration + 100)
      
    } catch (error) {
      console.error('流程图布局失败:', error)
      message.error('流程图布局失败，请检查控制台错误信息')
    } finally {
      this.setState({ loading: false })
    }
  }

  // 应用智能布局
  applySmartLayout = async () => {
    this.setState({ loading: true })
    
    try {
      const processor = new ElkLayoutProcessor({
        useWorker: true
      })
      
      const layoutResult = await processor.smartLayout(this.graph, {
        defaultNodeSize: { width: 120, height: 50 },
        autoCalculateSize: true,
        edgeRouting: this.state.edgeRouting
      })
      
      message.success('智能布局应用成功！已自动分析图形特征并选择最优布局算法')
      
      // 自动调整视图
      setTimeout(() => {
        this.graph.zoomToFit({ padding: 40, maxScale: 1.2 })
      }, this.state.animationDuration + 100)
      
    } catch (error) {
      console.error('智能布局失败:', error)
      message.error('智能布局失败，请检查控制台错误信息')
    } finally {
      this.setState({ loading: false })
    }
  }

  // 应用预设布局
  applyPresetLayout = async (preset) => {
    this.setState({ loading: true })
    
    try {
      let elkConfig
      if (preset === 'custom') {
        // 使用自定义配置
        elkConfig = {
          algorithm: 'layered',
          direction: 'DOWN',
          spacing: this.state.customSpacing,
          useWorker: true
        }
      } else {
        elkConfig = ElkLayoutProcessor.createPresetConfig(preset)
      }
      
      const elkProcessor = new ElkLayoutProcessor(elkConfig)
      
      await elkProcessor.applyLayoutToGraph(
        this.graph,
        {
          defaultNodeSize: { width: 120, height: 50 },
          autoCalculateSize: true,
          edgeRouting: this.state.edgeRouting
        },
        this.state.useAnimation ? this.state.animationDuration : 0
      )
      
      message.success(`${preset}布局应用成功！`)
      
      setTimeout(() => {
        this.graph.zoomToFit({ padding: 30, maxScale: 1.5 })
      }, this.state.animationDuration + 100)
      
    } catch (error) {
      console.error(`${preset}布局失败:`, error)
      message.error(`${preset}布局失败`)
    } finally {
      this.setState({ loading: false })
    }
  }

  // 更新自定义间距
  updateCustomSpacing = (key, value) => {
    this.setState({
      customSpacing: {
        ...this.state.customSpacing,
        [key]: value
      }
    })
  }

  // 重置为随机位置
  resetToRandomLayout = () => {
    const nodes = this.graph.getNodes()
    nodes.forEach(node => {
      node.position(
        Math.random() * 800,
        Math.random() * 500,
        { transition: { duration: 300 } }
      )
    })
    message.info('已重置为随机布局')
  }

  // 添加更多节点来测试大规模布局
  addMoreNodes = () => {
    const existingNodes = this.graph.getNodes()
    const newNodes = []
    const newEdges = []
    
    for (let i = 0; i < 10; i++) {
      const node = this.graph.createNode({
        id: `extra_${Date.now()}_${i}`,
        x: Math.random() * 800,
        y: Math.random() * 500,
        width: 100,
        height: 40,
        label: `扩展${i + 1}`,
        attrs: {
          body: { 
            fill: '#f0f0f0', 
            stroke: '#999',
            strokeWidth: 1
          },
          label: { 
            text: `扩展${i + 1}`,
            fill: '#666'
          }
        }
      })
      newNodes.push(node)
      
      // 随机连接到已有节点
      if (existingNodes.length > 0) {
        const randomExisting = existingNodes[Math.floor(Math.random() * existingNodes.length)]
        const edge = this.graph.createEdge({
          id: `extra_edge_${Date.now()}_${i}`,
          source: randomExisting.id,
          target: node.id,
          attrs: {
            line: { 
              stroke: '#999', 
              strokeWidth: 1, 
              targetMarker: { name: 'block' }
            }
          }
        })
        newEdges.push(edge)
      }
    }
    
    this.graph.addCells([...newNodes, ...newEdges])
    message.success('添加了10个节点，可以测试大规模布局效果')
  }

  refContainer = (container) => {
    this.container = container
  }

  render() {
    return (
      <div className="x6-graph-wrap" style={{ padding: 24 }}>
        <Alert
          message="📊 流程图布局优化指南"
          description="专门针对您的流程图场景优化：实现连线横平竖直、节点中心对齐、允许连线部分重叠。推荐优先使用'流程图专用'布局。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Card title="布局控制面板" style={{ marginBottom: 16 }}>
          <Space wrap size="large">
            {/* 流程图专用布局 */}
            <div>
              <Button 
                type="primary" 
                size="large"
                onClick={this.applyFlowchartLayout}
                loading={this.state.loading}
                style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', marginRight: 12 }}
              >
                📊 流程图专用(推荐)
              </Button>
            </div>
            
            {/* 智能布局 */}
            <div>
              <Button 
                type="primary" 
                size="large"
                onClick={this.applySmartLayout}
                loading={this.state.loading}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                🎯 智能布局
              </Button>
            </div>
            
            <Divider type="vertical" style={{ height: 60 }} />
            
            {/* 预设布局 */}
            <div>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>预设布局：</div>
              <Space wrap>
                <Button onClick={() => this.applyPresetLayout('clear')}>
                  ✨ 清晰布局
                </Button>
                <Button onClick={() => this.applyPresetLayout('flowchart')}>
                  📊 流程图
                </Button>
                <Button onClick={() => this.applyPresetLayout('hierarchy')}>
                  🌳 层次结构
                </Button>
                <Button onClick={() => this.applyPresetLayout('compact')}>
                  📦 紧凑布局
                </Button>
                <Button onClick={() => this.applyPresetLayout('network')}>
                  🕸️ 网络图
                </Button>
              </Space>
            </div>
            
            <Divider type="vertical" style={{ height: 60 }} />
            
            {/* 工具按钮 */}
            <div>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>工具：</div>
              <Space wrap>
                <Button onClick={this.loadComplexSampleData}>重置示例</Button>
                <Button onClick={this.addMoreNodes}>添加节点</Button>
                <Button onClick={this.resetToRandomLayout}>随机布局</Button>
              </Space>
            </div>
          </Space>
          
          {/* 高级设置 */}
          <Divider />
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 12, fontWeight: 'bold' }}>高级设置：</div>
            <Space wrap size="large">
              <div>
                <span>边路由：</span>
                <Select
                  value={this.state.edgeRouting}
                  onChange={(value) => this.setState({ edgeRouting: value })}
                  style={{ width: 120, marginLeft: 8 }}
                >
                  <Option value="ORTHOGONAL">正交线</Option>
                  <Option value="POLYLINE">折线</Option>
                  <Option value="SPLINES">曲线</Option>
                </Select>
              </div>
              
              <div>
                <span>动画：</span>
                <Switch
                  checked={this.state.useAnimation}
                  onChange={(checked) => this.setState({ useAnimation: checked })}
                  style={{ marginLeft: 8 }}
                />
              </div>
              
              {this.state.useAnimation && (
                <div>
                  <span>动画时长：</span>
                  <Slider
                    min={100}
                    max={1000}
                    value={this.state.animationDuration}
                    onChange={(value) => this.setState({ animationDuration: value })}
                    style={{ width: 100, marginLeft: 8 }}
                  />
                  <span style={{ marginLeft: 8 }}>{this.state.animationDuration}ms</span>
                </div>
              )}
            </Space>
          </div>
          
          {/* 自定义间距设置 */}
          <Divider />
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 12, fontWeight: 'bold' }}>
              自定义间距设置：
              <Button 
                size="small" 
                onClick={() => this.applyPresetLayout('custom')}
                style={{ marginLeft: 12 }}
              >
                应用自定义布局
              </Button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, maxWidth: 600 }}>
              <div>
                <div>节点间距：{this.state.customSpacing.nodeNode}</div>
                <Slider
                  min={20}
                  max={100}
                  value={this.state.customSpacing.nodeNode}
                  onChange={(value) => this.updateCustomSpacing('nodeNode', value)}
                />
              </div>
              <div>
                <div>层间节点间距：{this.state.customSpacing.nodeNodeBetweenLayers}</div>
                <Slider
                  min={40}
                  max={150}
                  value={this.state.customSpacing.nodeNodeBetweenLayers}
                  onChange={(value) => this.updateCustomSpacing('nodeNodeBetweenLayers', value)}
                />
              </div>
              <div>
                <div>边节点间距：{this.state.customSpacing.edgeNodeBetweenLayers}</div>
                <Slider
                  min={20}
                  max={80}
                  value={this.state.customSpacing.edgeNodeBetweenLayers}
                  onChange={(value) => this.updateCustomSpacing('edgeNodeBetweenLayers', value)}
                />
              </div>
              <div>
                <div>边间距：{this.state.customSpacing.edgeEdge}</div>
                <Slider
                  min={10}
                  max={50}
                  value={this.state.customSpacing.edgeEdge}
                  onChange={(value) => this.updateCustomSpacing('edgeEdge', value)}
                />
              </div>
            </div>
          </div>
        </Card>
        
        <div
          ref={this.refContainer}
          className="x6-graph"
          style={{
            border: '2px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            backgroundColor: '#fff'
          }}
        />
        
        <Card style={{ marginTop: 16 }} size="small">
          <div style={{ fontSize: 12, color: '#666' }}>
            <strong>📊 流程图布局使用指南：</strong>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li><strong>流程图专用</strong>：专门为您的场景优化，实现连线横平竖直、节点中心对齐（推荐首选）</li>
              <li><strong>横平竖直连线</strong>：使用 ORTHOGONAL 正交路由，避免弯曲连线</li>
              <li><strong>节点中心对齐</strong>：自动对齐同层节点的中心线，形成整齐布局</li>
              <li><strong>允许连线重叠</strong>：合理利用空间，连线可以部分重叠以减少占用面积</li>
              <li><strong>间距优化</strong>：自动设置合理的节点和连线间距，保证清晰可读</li>
              <li><strong>快捷键</strong>：Ctrl+滚轮缩放，Shift+拖拽平移</li>
            </ul>
          </div>
        </Card>
      </div>
    )
  }
}