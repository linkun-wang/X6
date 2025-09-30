import React from 'react'
import { Checkbox, InputNumber, Button, Select, message } from 'antd'
import { Graph, Cell, Node, Shape, View, Rectangle } from '@antv/x6'
import '../index.less'
import { CheckboxChangeEvent } from 'antd/lib/checkbox'
import debounce from 'lodash/debounce'
import { AsyncBatchProcessor } from '../../utils/AsyncBatchProcessor'
import { ElkLayoutProcessor, ElkLayoutConfig } from '../../utils/ElkLayoutProcessor'

const { Option } = Select

function random(max: number, min: number) {
  return Math.floor(Math.random() * (max - min)) + min
}

class Loader extends View {
  bar: HTMLDivElement
  progressContainer: HTMLDivElement
  overlay: HTMLDivElement
  container: HTMLDivElement; // 明确声明container的类型为HTMLDivElement
  constructor() {
    super()
    // 创建遮罩层
    this.overlay = document.createElement('div')
    this.$(this.overlay).css({
      position: 'fixed', // 改为fixed定位，确保覆盖整个视口
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(255, 255, 255, 0.9)', // 增加不透明度使其更明显
      zIndex: 9999, // 更高的z-index
      display: 'none',
      justifyContent: 'center',
      alignItems: 'center',
    })
    
    this.progressContainer = document.createElement('div')
    this.$(this.progressContainer).css({
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '20px',
      textAlign: 'center',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)', // 增强阴影效果
      zIndex: 10000,
      minWidth: '300px', // 设置最小宽度
      display: 'none',
    })
    
    // 添加加载文字
    const loadingText = document.createElement('div')
    loadingText.textContent = '正在渲染，请稍候...'
    loadingText.style.marginBottom = '10px'
    loadingText.style.fontSize = '16px'
    loadingText.style.color = '#333'
    this.progressContainer.appendChild(loadingText)
    
    this.bar = document.createElement('div')
    this.$(this.bar).css({
      height: '20px',
      width: '0%',
      background: '#1890ff',
      transition: 'width 0.2s',
      borderRadius: '10px', 
    })
    // 将进度条添加到容器中
    this.progressContainer.appendChild(this.bar)
    
    // 重写父类的container属性
    this.container = document.createElement('div')
    Object.assign(this.container.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: '9999',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    })
    this.container.appendChild(this.overlay)
    this.container.appendChild(this.progressContainer)
    
    // 在构造函数中将容器添加到document.body
    document.body.appendChild(this.container)
  }

  progress(value: number): void {
    try {
      if (this.bar && this.bar.style) {
        const safeValue = Math.min(Math.max(value, 0), 1) * 100;
        this.bar.style.width = `${safeValue}%`;
      }
    } catch (e) {
      console.warn('Error updating progress:', e);
    }
  }
  
  // 显示加载遮罩
  show(): void {
    console.log('Loader showing...'); // 添加调试日志
    
    // 明确设置显示状态，避免使用可能导致类型问题的removeProperty
    try {
      // 使用标准方式设置display属性
      if (this.overlay && this.overlay.style) {
        this.overlay.style.display = 'flex';
      }
      if (this.progressContainer && this.progressContainer.style) {
        this.progressContainer.style.display = 'block';
      }
      if (this.container && this.container.style) {
        this.container.style.display = 'flex'; // 使用flex布局保持居中
      }
    } catch (e) {
      console.warn('Error setting styles:', e);
    }
    
    console.log('Loader shown, checking attributes:');
    console.log('Overlay display:', this.overlay?.style?.display);
    console.log('Progress container display:', this.progressContainer?.style?.display);
    console.log('Container display:', this.container?.style?.display);
  }
  
  // 隐藏加载遮罩
  hide(): void {
    if (this.overlay && this.overlay.style) {
      this.overlay.style.display = 'none';
    }
    if (this.progressContainer && this.progressContainer.style) {
      this.progressContainer.style.display = 'none';
    }
    if (this.container && this.container.style) {
      this.container.style.display = 'none'; // 隐藏最外层容器，确保不会遮挡页面元素
    }
  }
}

export default class Example extends React.Component<
  Example.Props,
  Example.State
> {
  private container: HTMLDivElement
  private rootContainer: HTMLDivElement
  private graph: Graph
  private loader: Loader = new Loader()
  private windowBBox: Rectangle
  private viewport: Node
  private virtualBox: HTMLDivElement | null
  private nodes: Node[] = []
  private edges: Cell[] = []

  state: Example.State = {
    customViewport: false,
    padding: 100,
    keepRendered: false,
    keepDragged: false,
    count: 3000,
    columns: 20,
    batch: 1000,
    useVirtualBox: true, // 新增：控制是否使用虚拟容器
    scale: 1.0, // 当前缩放系数
    // 新增ELK布局相关状态
    layoutAlgorithm: 'layered' as 'layered' | 'force' | 'stress' | 'mrtree' | 'radial',
    layoutDirection: 'DOWN' as 'DOWN' | 'UP' | 'LEFT' | 'RIGHT',
    useElkLayout: false, // 是否启用ELK自动布局
  }

  private clearingCanvas = false; // 标记是否正在清空画布

  componentDidMount() {
    const graph = (this.graph = new Graph({
      container: this.container,
      // 启用历史记录功能
      history: {
        enabled: true,
        beforeAddCommand: (event, args) => {
          // 可以在这里过滤哪些操作需要记录到历史中
          return true;
        },
      },
      grid: {
        visible: true,
        size: 10,
        type: 'doubleMesh',
        args: [
          {
            color: '#e6e6e6',
            thickness: 1
          },
          {
            color: '#ddd',
            factor: 4,
            thickness: 1
          }
        ]
      },
      async: true,
      frozen: true,
      sorting: 'approx',
      // 添加更严格的渲染控制，防止引用错误
      interacting: {
        edgeMovable: false, // 禁止边的移动，减少引用检查
      },
      // 缩放最大值最小值
      scaling: {
        min: 0.3,
        max: 1.8,
      },
      // 框选
      selecting: {
        enabled: true,
        rubberband: true, // 启用框选
      },
      // 滚动
      scroller: {
        enabled: true,
        autoResize: true,
        autoResizeOptions: {
          border: 30
        },
        padding: 0,
        pageWidth: 0,
        pageHeight: 0
      },
      connecting: {
        anchor: 'nodeCenter',
        connectionPoint: 'boundary',
      },
      checkView: ({ view, unmounted }) => {
        // 关键修复：在清空画布期间隐藏所有视图，避免引用错误
        if (this.clearingCanvas) {
          return false; // 清空期间隐藏所有元素，避免视图状态冲突
        }
        
        if (!this.state.useVirtualBox) {
          return true
        }
        if (this.state.keepDragged && view.cid === draggedCid) {
          return true
        }
        if (this.state.keepRendered && unmounted) {
          return true
        }

        if (!view.cell) {
          return false
        }

        if (this.state.customViewport) {
          var viewportBBox = this.viewport.getBBox()
          return viewportBBox.isIntersectWithRect(
            view.cell.getBBox().inflate(this.state.padding),
          )
        } else {
          if (view.cell === this.viewport) {
            return false
          }
          return this.windowBBox.isIntersectWithRect(
            view.cell.getBBox().inflate(this.state.padding),
          )
        }
      },
    }))
    
    // 移除重复添加loader到document.body的代码，因为Loader构造函数中已经添加了
    
    Shape.Edge.config({
      attrs: {
        line: {
          stroke: '#808080',
          strokeWidth: 1,
          targetMarker: {
            name: 'block',
            width: 6,
            height: 6
          }
        }
      },
      connector: {
        name: 'rounded'
      },
      router: {
        name: 'manhattan',
        args: {
          step: 10,  // 增加步长以减少计算复杂度
          padding: 8,
          maxLoopCount: 3000,  // 增加最大循环次数
          excludeHiddenNodes: true,  // 排除隐藏节点作为障碍物
          maxDirectionChange: 90,  // 允许最大方向变化
          perpendicular: true  // 使用垂直连接
        }
      }
    })

    // 使用箭头函数包装updateVirtualBoxSize，保持this上下文，然后用debounce防抖
    const debouncedUpdateVirtualBox = debounce(() => {
      if (this.state.useVirtualBox) {
        this.updateVirtualBoxSize();
      }
    }, 300);

    // 监听单元格被删除事件 - 这将捕获所有删除情况（UI交互、API调用、快捷键等）
    graph.on('cell:removed', ({ cell }) => {
      debouncedUpdateVirtualBox();
    });
    
    // 监听单元格被添加事件 - 这将捕获所有添加情况（API调用、撤销恢复、批量添加等）
    graph.on('cell:added', ({ cell }) => {
      debouncedUpdateVirtualBox();
    });
    
    // 监听历史重做事件，处理重做清空时的虚拟渲染冲突
    if (graph.history) {
      graph.history.on('redo', ({ cmds }: any) => {
        // 检查是否是大批量删除操作（可能是清空操作的重做）
        if (Array.isArray(cmds) && cmds.length > 100) {
          const hasRemoveCommands = cmds.some((cmd: any) => 
            cmd && cmd.event && (cmd.event.includes('remove') || cmd.event.includes('removed'))
          );
          if (hasRemoveCommands) {
            console.log('检测到重做清空操作，启用clearingCanvas保护');
            this.clearingCanvas = true;
            // 监听渲染完成事件，确保所有异步操作都完成后再恢复
            graph.once('render:done', () => {
              this.clearingCanvas = false;
              console.log('重做清空渲染完成，恢复虚拟渲染');
            });
          }
        }
      });
    }

    // 监听缩放事件
    graph.on('scale', ({ sx, sy }) => {
      this.setState({ scale: sx });
      if (this.state.useVirtualBox) {
        this.updateVirtualBoxSize()
      }
    })

    // 监听滚动事件
    const scrollerContainer = this.getScrollerContainer()
    if (scrollerContainer) {
      scrollerContainer.addEventListener('scroll', () => {
        this.setWindowBBox()
        this.graph.unfreeze()
      })
    }

    // Dragged view is always visible
    let draggedCid: string | null = null
    graph.on('cell:mousedown',  ({ view }: { view: View }) => {
      draggedCid = view.cid
    })
    graph.on('cell:mouseup',  () => {
      draggedCid = null
    })

    // 监听窗口滚动和调整大小事件
    // window.onscroll = () => {
    //   this.setWindowBBox()
    // }
    window.onresize = () => {
      this.setWindowBBox()
      if (this.state.useVirtualBox) {
        this.updateVirtualBoxSize()
      }
    }

    this.setWindowBBox()
    this.restart()
  }

  // 获取 scroller 容器
  getScrollerContainer(): HTMLDivElement | null {
    return this.rootContainer.querySelector('.x6-graph-scroller') as HTMLDivElement | null
  }

  // 获取 scroller 内容容器
  getScrollerContent(): HTMLDivElement | null {
    return this.rootContainer.querySelector('.x6-graph-scroller-content') as HTMLDivElement | null
  }

  // 创建虚拟容器
  createVirtualBox(): void {
    if (!this.state.useVirtualBox) return

    const scrollerContainer = this.getScrollerContainer()
    const scrollerContent = this.getScrollerContent()
    
    if (scrollerContainer && scrollerContent) {
      // 如果已经存在虚拟容器，先移除
      if (this.virtualBox) {
        this.virtualBox.remove()
      }
      
      // 创建新的虚拟容器
      this.virtualBox = document.createElement('div')
      this.virtualBox.className = 'virtual-box'
      this.virtualBox.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        pointer-events: none;
      `
      
      // 设置内容容器为绝对定位
      scrollerContent.style.position = 'absolute'
      scrollerContent.style.top = '0'
      scrollerContent.style.left = '0'
      
      // 将虚拟容器添加到 scroller 容器中
      scrollerContainer.appendChild(this.virtualBox)
      
      // 确保虚拟容器在内容容器之前
      scrollerContainer.insertBefore(this.virtualBox, scrollerContent)
    }
  }

  // 更新虚拟容器尺寸
  updateVirtualBoxSize(): void {
    if (!this.state.useVirtualBox || !this.virtualBox) return
    
    // 计算所有节点的理论边界框
    const scale = this.graph.transform.getScale()
    const allNode = this.graph.getNodes();
    // 检查是否有实际节点可以用来计算尺寸
    if (allNode && allNode.length > 0) {
      // 计算实际节点的边界框
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      
      // 遍历所有节点计算实际边界
      allNode.forEach(node => {
        const bbox = node.getBBox()
        minX = Math.min(minX, bbox.x)
        minY = Math.min(minY, bbox.y)
        maxX = Math.max(maxX, bbox.x + bbox.width)
        maxY = Math.max(maxY, bbox.y + bbox.height)
      })
      
      // 应用缩放因子
      const virtualWidth = (maxX - minX) * scale.sx
      const virtualHeight = (maxY - minY) * scale.sy
      
      // 更新虚拟容器尺寸 - 添加left和top位置计算，确保完全覆盖所有节点
      this.virtualBox.style.width = `${virtualWidth}px`
      this.virtualBox.style.height = `${virtualHeight}px`
    } else {
      // 如果没有节点，将虚拟容器尺寸设置为最小
      this.virtualBox.style.width = '0px'
      this.virtualBox.style.height = '0px'
    }
  }

  // 滚动到指定节点
  scrollToNode(nodeId: string): void {
    const node = this.graph.getCellById(nodeId) as Node
    if (node) {
      this.graph.scrollToCell(node, { animation: { duration: 300 } })
    }
  }

  // 随机颜色范围：赤橙黄绿青蓝紫
  randomColor() {
    // 定义赤橙黄绿青蓝紫的色相范围
    const hueRanges = [
      [0, 15],   // 红色
      [16, 45],  // 橙色
      [46, 75],  // 黄色
      [76, 155], // 绿色
      [156, 185], // 青色
      [186, 265], // 蓝色
      [266, 335]  // 紫色
    ]
    
    // 随机选择一个色相范围
    const selectedRange = hueRanges[Math.floor(Math.random() * hueRanges.length)]
    const hue = random(selectedRange[0], selectedRange[1])
    
    return (
      'hsl(' +
      hue +
      ',' +
      random(58, 72) +
      '%,' +
      random(45, 55) +
      '%)'
    )
  }

  // 优化的节点位置生成方法 - 确保节点从左上角正确排列且间距适中
  generateNodePosition(index: number, width: number, height: number): { x: number; y: number } {
    const columnCount = this.state.columns;
    const row = Math.floor(index / columnCount);
    const column = index % columnCount;
    
    // 使用适中的间距，考虑节点的随机大小范围（30-200宽，20-50高）
    // 确保有足够间距避免重叠，但又不会太大
    const cellWidth = 200;  // 适中的单元格宽度
    const cellHeight = 80;  // 适中的单元格高度
    
    // 从左上角(80, 80)开始排列，提供合适的边缘距离
    const x = 30 + column * cellWidth;
    const y = 30 + row * cellHeight;
    
    return { x, y };
  }

  // 重新渲染 - 专注于渲染性能优化
  restart() {
    console.log('开始重新渲染 - 专注于渲染性能');
    
    // 立即显示loading
    this.showLoading();
    
    console.time('perf-all');
    
    // 关键修复：使用RAF延迟数据生成，防止UI阻塞
    requestAnimationFrame(() => {
      console.log('RAF执行，开始数据生成');
      const count = this.state.count;
      this.generateMockDataAsync(count);
    });
  }
  
  // 异步分批生成大量数据 - 使用新的简化API
  private async generateMockDataAsync(totalCount: number) {
    const nodesData: any[] = [];
    const edgesData: any[] = [];
    
    // 使用通用工具异步生成节点数据
    await AsyncBatchProcessor.generateBatch(
      totalCount,
      500, // 每批500个
      (index: number) => {
        const nodePosition = this.generateNodePosition(index, 100, 50);
        const nodeData = {
          id: `node-${index}`,
          shape: 'rect',
          x: nodePosition.x,
          y: nodePosition.y,
          width: random(30, 200),
          height: random(20, 50),
          attrs: {
            body: { fill: this.randomColor() },
            label: { text: index },
          },
        };
        
        nodesData.push(nodeData);
        
        // 同时生成边数据
        if (index > 0) {
          const edgeData = {
            id: `edge-${index}`,
            shape: 'edge',
            source: `node-${index - 1}`,
            target: `node-${index}`,
          };
          edgesData.push(edgeData);
        }
        
        return nodeData;
      },
      (progress: number, processed: number, total: number) => {
        // 更新进度（数据生成占总进度的80%）
        this.loader.progress(progress * 0.8);
        console.log(`数据生成进度: ${Math.round(progress * 100)}%`);
      }
    );
    
    console.log('数据生成完成，开始渲染');
    const cellsData = { nodes: nodesData, edges: edgesData };
    const cells = this.convertDataToCells(cellsData);
    this.renderCells(cells);
  }
  
  // 将json数据转换为X6 Cell对象
  private convertDataToCells(data: { nodes: any[], edges: any[] }): Cell[] {
    const cells: Cell[] = [];
    
    // 转换节点
    data.nodes.forEach(nodeData => {
      const node = new Shape.Rect({
        id: nodeData.id,
        zIndex: 2,
        size: { width: nodeData.width, height: nodeData.height },
        position: { x: nodeData.x, y: nodeData.y },
        attrs: nodeData.attrs,
      });
      cells.push(node);
    });
    
    // 转换边
    data.edges.forEach(edgeData => {
      const edge = new Shape.Edge({
        id: edgeData.id,
        zIndex: 1,
        source: { cell: edgeData.source },
        target: { cell: edgeData.target },
      });
      cells.push(edge);
    });
    
    return cells;
  }
  
  // 简化的渲染方法
  private renderCells(cells: Cell[]) {
    console.log('开始渲染，元素数量:', cells.length);
    
    this.graph.model.resetCells(cells);

    // 创建虚拟容器
    this.createVirtualBox();
    if (this.state.useVirtualBox) {
      this.updateVirtualBoxSize();
    }
    
    // 监听渲染完成
    this.graph.once('render:done', () => {
      console.log('渲染完成');
      console.timeEnd('perf-all');
      this.hideLoading();
    });
  }

  
  // 简化的节点创建 - 只负责创建数据
  createAllNodes(count: number) {
    for (let i = 0; i < count; i++) {
      const width = random(30, 200);
      const height = random(20, 50);
      const nodePosition = this.generateNodePosition(i, width, height);
      
      const node = new Shape.Rect({
        zIndex: 2,
        size: { width, height },
        position: nodePosition,
        attrs: {
          body: { fill: this.randomColor() },
          label: { text: i },
        },
      });
      this.nodes.push(node);
    }
  }
  
  // 简化的边创建
  createAllEdges() {
    for (let i = 1; i < this.nodes.length; i++) {
      const source = this.nodes[i - 1];
      const target = this.nodes[i];
      const edge = new Shape.Edge({
        zIndex: 1,
        source: { cell: source.id },
        target: { cell: target.id },
      });
      this.edges.push(edge);
    }
  }
  
  // 单独的loading API
  showLoading() {
    this.loader.show();
    this.loader.progress(0);
  }

  hideLoading() {
    this.loader.hide();
  }
  
  // 组件卸载时清理loader容器，避免内存泄漏
  componentWillUnmount() {
    if (this.loader && this.loader.container && document.body.contains(this.loader.container)) {
      document.body.removeChild(this.loader.container)
    }
  }

  setWindowBBox() {
    this.windowBBox = this.graph.pageToLocal(
      window.scrollX,
      window.scrollY,
      window.innerWidth,
      window.innerHeight,
    )
  }

  refContainer = (container: HTMLDivElement) => {
    this.container = container
  }

  refRootContainer = (container: HTMLDivElement) => {
    this.rootContainer = container
  }
  // 撤销操作
  onUndo = () => {
    try {
      if (this.graph.history) {
        this.graph.history.undo();
        console.log('执行撤销操作');
      } else {
        console.warn('历史记录功能未启用');
      }
    } catch (error) {
      console.error('撤销操作失败:', error);
    }
  };

  // 重做操作
  onRedo = () => {
    try {
      if (this.graph.history) {
        this.graph.history.redo();
        console.log('执行重做操作');
      } else {
        console.warn('历史记录功能未启用');
      }
    } catch (error) {
      console.error('重做操作失败:', error);
    }
  };

  // 缩放
  onZoom = (direction: 'in' | 'out') => {
    if (direction === 'in') {
      this.graph.zoom(0.1)
    } else {
      this.graph.zoom(-0.1)
    }
    // 更新缩放系数状态
    this.setState({ scale: this.graph.transform.getScale().sx });
  }

  // ELK布局相关方法
  onApplyElkLayout = async () => {
    const nodes = this.graph.getNodes();
    const edges = this.graph.getEdges();
    
    if (nodes.length === 0) {
      message.warning('没有节点可以进行布局');
      return;
    }

    this.showLoading();
    
    try {
      // 创建ELK布局处理器
      const elkConfig: ElkLayoutConfig = {
        algorithm: this.state.layoutAlgorithm,
        direction: this.state.layoutDirection,
        spacing: {
          nodeNodeBetweenLayers: 50,
          edgeNodeBetweenLayers: 25,
          nodeNode: 40,
          edgeEdge: 20
        },
        useWorker: true
      };
      
      const elkProcessor = new ElkLayoutProcessor(elkConfig);
      
      // 应用布局到图形
      const layoutResult = await elkProcessor.applyLayoutToGraph(
        this.graph,
        {
          defaultNodeSize: { width: 120, height: 60 },
          autoCalculateSize: true,
          edgeRouting: 'ORTHOGONAL'
        },
        500 // 动画时长
      );
      
      console.log('ELK布局应用成功', layoutResult);
      message.success(`ELK布局完成！节点：${layoutResult.nodes.length}，边：${layoutResult.edges.length}`);
      
      // 自动调整视图以适应布局
      setTimeout(() => {
        this.graph.zoomToFit({ padding: 20, maxScale: 1.5 });
      }, 600);
      
    } catch (error) {
      console.error('ELK布局失败:', error);
      message.error('ELK布局失败，请检查控制台错误信息');
    } finally {
      this.hideLoading();
    }
  }

  // 应用预设布局
  onApplyPresetLayout = async (preset: 'flowchart' | 'hierarchy' | 'network' | 'circular') => {
    const nodes = this.graph.getNodes();
    
    if (nodes.length === 0) {
      message.warning('没有节点可以进行布局');
      return;
    }

    this.showLoading();
    
    try {
      const elkConfig = ElkLayoutProcessor.createPresetConfig(preset);
      const elkProcessor = new ElkLayoutProcessor(elkConfig);
      
      const layoutResult = await elkProcessor.applyLayoutToGraph(
        this.graph,
        { autoCalculateSize: true },
        400
      );
      
      message.success(`${preset}布局应用成功！`);
      
      setTimeout(() => {
        this.graph.zoomToFit({ padding: 20, maxScale: 1.5 });
      }, 500);
      
    } catch (error) {
      console.error(`${preset}布局失败:`, error);
      message.error(`${preset}布局失败`);
    } finally {
      this.hideLoading();
    }
  }
  onCountChange = (count: number) => this.setState({ count })
  onColumnsChange = (columns: number) => this.setState({ columns })
  onBatchChange = (batch: number) => this.setState({ batch })
  onRestartClick = () => this.restart()
  onCustomViewport = (e: any) => this.setState({ customViewport: e.target.checked })
  onPaddingChange = (e: CheckboxChangeEvent) =>
    this.setState({ padding: e.target.checked ? 100 : 1 })
  onKeepRenderedChange = (e: CheckboxChangeEvent) =>
    this.setState({ keepRendered: e.target.checked })
  onKeepDraggedChange = (e: CheckboxChangeEvent) => this.setState({ keepDragged: e.target.checked })

  // ELK布局配置方法
  onLayoutAlgorithmChange = (algorithm: 'layered' | 'force' | 'stress' | 'mrtree' | 'radial') => {
    this.setState({ layoutAlgorithm: algorithm });
  }
  
  onLayoutDirectionChange = (direction: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT') => {
    this.setState({ layoutDirection: direction });
  }
  
  onUseElkLayoutChange = (e: CheckboxChangeEvent) => {
    this.setState({ useElkLayout: e.target.checked });
  }
  onUseVirtualBoxChange = (e: CheckboxChangeEvent) => {
    this.setState({ useVirtualBox: e.target.checked }, () => {
      this.onClearCanvas();
      if (this.state.useVirtualBox) {
        this.createVirtualBox()
        this.updateVirtualBoxSize()
      } else if (this.virtualBox) {
        this.virtualBox.remove()
        this.virtualBox = null
        const scrollerContent = this.getScrollerContent()
        if (scrollerContent) {
          scrollerContent.style.position = ''
          scrollerContent.style.top = ''
          scrollerContent.style.left = ''
        }
      }
    })
  }

  // 删除选中的节点和连线
  onDeleteSelected = () => {
    try {
      // 获取当前选中的所有元素
      const selectedCells = this.graph.getSelectedCells();
      
      if (selectedCells.length > 0) {
        // 使用batch操作优化删除性能
        this.graph.model.startBatch('remove');
        
        // 分类处理：先删除边再删除节点
        const edges = selectedCells.filter(cell => cell.isEdge());
        const nodes = selectedCells.filter(cell => cell.isNode());
        
        // 先删除边，使用silent避免触发不必要的事件
        if (edges.length > 0) {
          this.graph.removeCells(edges, { silent: true });
        }
        
        // 再删除节点
        if (nodes.length > 0) {
          this.graph.removeCells(nodes, { silent: true });
        }
        
        this.graph.model.stopBatch('remove');
        
        console.log(`已删除 ${selectedCells.length} 个元素`);
      } else {
        console.log('没有选中的元素');
      }
    } catch (error) {
      console.error('删除选中元素时出错:', error);
      // 备用方案：使用原有方法
      const selectedCells = this.graph.getSelectedCells();
      if (selectedCells.length > 0) {
        this.graph.removeCells(selectedCells);
      }
    }
  }

  // 清空画布 - 简单有效的方法
  onClearCanvas = () => {
    console.log('开始清空画布...');
    
    // 获取所有元素
    const allCells = this.graph.getCells();
    
    if (allCells.length === 0) {
      console.log('画布已经是空的');
      return;
    }
    
    console.log(`准备清空 ${allCells.length} 个元素`);
    
    // 关键修复：在清空期间禁用虚拟渲染
    this.clearingCanvas = true;
    
    // 最简单有效的方法：直接使用removeCells，支持历史回退
    this.graph.clearCells();
    
    // 重置内部状态
    this.nodes = [];
    this.edges = [];

    // 恢复缩放比例
    this.graph.zoomTo(1);

    // 清除完成后，还原容器尺寸
    this.graph.once('render:done', () => {
      this.clearingCanvas = false;
      console.log('清空画布完成，支持撤销操作*****');
      // 更新虚拟容器
      if (this.virtualBox) {
        this.virtualBox.style.width = '0px';
        this.virtualBox.style.height = '0px';
      }
      
      // 获取画布的容器元素
      const scrollerContent = this.getScrollerContent();
      
      if (scrollerContent) {
        // 恢复默认样式
        scrollerContent.style.width = '100%';
        scrollerContent.style.height = '100%';
      }
    })
  };

  render() {
    return (
      <div
        ref={this.refRootContainer}
        className="x6-graph-wrap"
        style={{
          padding: 24,
        }}
      >
        <div
          className="x6-graph-tools"
          style={{ width: '100%', userSelect: 'none' }}
        >
          {/* 第一行：基本控件 */}
          <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <Checkbox
              checked={this.state.useVirtualBox}
              onChange={this.onUseVirtualBoxChange}
            >
              是否启用虚拟渲染
            </Checkbox>
            
            <span>节点总数</span>
            <InputNumber
              value={this.state.count}
              onChange={this.onCountChange}
              style={{ width: 100 }}
            />
            
            <span>每行节点数</span>
            <InputNumber
              value={this.state.columns}
              onChange={this.onColumnsChange}
              style={{ width: 80 }}
            />
            
            <Button type='primary' onClick={this.onRestartClick}>重新渲染</Button>
            <Button onClick={() => this.onZoom('in')}>放大</Button>
            <Button onClick={() => this.onZoom('out')}>缩小</Button>
            
            <span style={{ color: '#1890ff', fontSize: '14px', fontWeight: 'bold' }}>
              缩放系数: {(this.state.scale * 100).toFixed(0)}%
            </span>
          </div>
          
          {/* 第二行：ELK布局控件 */}
          <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <Checkbox
              checked={this.state.useElkLayout}
              onChange={this.onUseElkLayoutChange}
            >
              启用ELK自动布局
            </Checkbox>
            
            <span>布局算法:</span>
            <Select
              value={this.state.layoutAlgorithm}
              onChange={this.onLayoutAlgorithmChange}
              style={{ width: 120 }}
              size="small"
            >
              <Option value="layered">分层布局</Option>
              <Option value="force">力导向布局</Option>
              <Option value="stress">应力布局</Option>
              <Option value="mrtree">树形布局</Option>
              <Option value="radial">径向布局</Option>
            </Select>
            
            <span>布局方向:</span>
            <Select
              value={this.state.layoutDirection}
              onChange={this.onLayoutDirectionChange}
              style={{ width: 80 }}
              size="small"
            >
              <Option value="DOWN">下</Option>
              <Option value="UP">上</Option>
              <Option value="LEFT">左</Option>
              <Option value="RIGHT">右</Option>
            </Select>
            
            <Button 
              onClick={this.onApplyElkLayout}
              type="primary"
              size="small"
              disabled={!this.state.useElkLayout}
            >
              应用布局
            </Button>
            
            <span style={{ marginLeft: '20px' }}>预设布局:</span>
            <Button size="small" onClick={() => this.onApplyPresetLayout('flowchart')}>流程图</Button>
            <Button size="small" onClick={() => this.onApplyPresetLayout('hierarchy')}>层次结构</Button>
            <Button size="small" onClick={() => this.onApplyPresetLayout('network')}>网络图</Button>
            <Button size="small" onClick={() => this.onApplyPresetLayout('circular')}>圆形布局</Button>
          </div>
          
          {/* 第三行：操作控件 */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <Button onClick={this.onUndo}>撤销</Button>
            <Button onClick={this.onRedo}>重做</Button>
            <Button onClick={this.onDeleteSelected} danger>删除选中</Button>
            <Button onClick={this.onClearCanvas} danger>清空画布</Button>
          </div>
        </div>
        <div
          ref={this.refContainer}
          className="x6-graph"
          style={{
            border: '1px solid #000',
            boxShadow: 'none',
            width: '100%',
            height: 'calc(100% - 160px)',
          }}
        />
      </div>
    )
  }
}

export namespace Example {
  export interface Props {}

  export interface State {
    customViewport: boolean
    padding: number
    keepRendered: boolean
    keepDragged: boolean
    count: number
    columns: number
    batch: number
    useVirtualBox: boolean
    scale: number // 当前缩放系数
    // ELK布局相关状态
    layoutAlgorithm: 'layered' | 'force' | 'stress' | 'mrtree' | 'radial'
    layoutDirection: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT'
    useElkLayout: boolean // 是否启用ELK自动布局
  }
}
