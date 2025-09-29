/**
 * 通用异步分批处理工具
 * 解决大数据量处理时的UI阻塞问题
 */
export class AsyncBatchProcessor {
  /**
   * 异步分批处理数组数据
   * @param fullArray 完整的数组数据
   * @param batchSize 每批处理的数量
   * @param processBatchData 批处理函数，接收一个数组，返回任意类型的结果
   * @param onProgress 进度回调 (progress: number, processed: number, total: number) => void
   * @returns Promise<R> 所有批次处理结果的合并
   */
  static async processBatches<T, R>(
    fullArray: T[],
    batchSize: number,
    processBatchData: (batch: T[]) => R | Promise<R>,
    onProgress?: (progress: number, processed: number, total: number) => void
  ): Promise<R[]> {
    const allResults: R[] = [];
    const total = fullArray.length;
    let currentIndex = 0;
    
    return new Promise(async (resolve) => {
      const processNextBatch = async () => {
        // 内部自动分割数组
        const batchEnd = Math.min(currentIndex + batchSize, total);
        const currentBatch = fullArray.slice(currentIndex, batchEnd);
        
        // 调用用户的批处理函数，支持返回对象
        const batchResult = await processBatchData(currentBatch);
        allResults.push(batchResult);
        
        // 更新进度
        currentIndex = batchEnd;
        const progress = currentIndex / total;
        onProgress?.(progress, currentIndex, total);
        
        // 如果还有数据要处理，继续下一批
        if (currentIndex < total) {
          requestAnimationFrame(processNextBatch);
        } else {
          // 所有批次处理完成
          resolve(allResults);
        }
      };
      
      // 开始处理第一批
      await processNextBatch();
    });
  }
  
  /**
   * 异步分批处理数组数据并合并对象结果
   * @param fullArray 完整的数组数据
   * @param batchSize 每批处理的数量
   * @param processBatchData 批处理函数，返回包含数组字段的对象
   * @param mergeResults 合并函数，将多个批次结果合并为一个对象
   * @param onProgress 进度回调
   * @returns Promise<R> 合并后的单个结果对象
   */
  static async processBatchesWithMerge<T, R extends Record<string, any>>(
    fullArray: T[],
    batchSize: number,
    processBatchData: (batch: T[]) => R | Promise<R>,
    mergeResults: (results: R[]) => R,
    onProgress?: (progress: number, processed: number, total: number) => void
  ): Promise<R> {
    const batchResults = await this.processBatches(
      fullArray,
      batchSize,
      processBatchData,
      onProgress
    );
    
    // 合并所有批次的结果
    return mergeResults(batchResults);
  }

  /**
   * 异步分批处理数组数据并自动合并对象结果（专门用于合并包含数组字段的对象）
   * @param fullArray 完整的数组数据
   * @param batchSize 每批处理的数量
   * @param processBatchData 批处理函数，返回包含数组字段的对象，如 { cells: [...] }
   * @param onProgress 进度回调
   * @returns Promise<R> 合并后的单个结果对象，所有数组字段都会被合并
   */
  static async processBatchesWithAutoMerge<T, R extends Record<string, any>>(
    fullArray: T[],
    batchSize: number,
    processBatchData: (batch: T[]) => R | Promise<R>,
    onProgress?: (progress: number, processed: number, total: number) => void
  ): Promise<R> {
    const batchResults = await this.processBatches(
      fullArray,
      batchSize,
      processBatchData,
      onProgress
    );
    
    // 自动合并对象结果
    if (batchResults.length === 0) {
      throw new Error('没有批次处理结果可供合并');
    }
    
    // 获取第一个结果作为基础
    const merged = { ...batchResults[0] } as R;
    
    // 从第二个结果开始合并
    for (let i = 1; i < batchResults.length; i++) {
      const current = batchResults[i];
      
      // 遍历当前对象的所有字段
      for (const key in current) {
        if (current.hasOwnProperty(key)) {
          const currentValue = current[key];
          const mergedValue = merged[key];
          
          // 如果字段值是数组，则合并数组
          if (Array.isArray(currentValue) && Array.isArray(mergedValue)) {
            merged[key] = [...mergedValue, ...currentValue] as any;
          }
          // 如果是非数组值，使用最新的值（或者根据业务需求定制）
          else {
            merged[key] = currentValue;
          }
        }
      }
    }
    
    return merged;
  }
  
  /**
   * 异步分批生成数据
   * @param count 要生成的数据总数
   * @param batchSize 每批生成的数量
   * @param generator 生成单个数据的函数
   * @param onProgress 进度回调
   * @returns Promise<T[]> 生成的数据数组
   */
  static async generateBatch<T>(
    count: number,
    batchSize: number,
    generator: (index: number) => T,
    onProgress?: (progress: number, processed: number, total: number) => void
  ): Promise<T[]> {
    const results: T[] = [];
    let currentIndex = 0;
    
    return new Promise((resolve) => {
      const processBatch = () => {
        const batchEnd = Math.min(currentIndex + batchSize, count);
        
        // 生成当前批次的数据
        for (let i = currentIndex; i < batchEnd; i++) {
          const result = generator(i);
          results.push(result);
        }
        
        // 更新进度
        currentIndex = batchEnd;
        const progress = currentIndex / count;
        onProgress?.(progress, currentIndex, count);
        
        // 如果还有数据要处理，继续下一批
        if (currentIndex < count) {
          requestAnimationFrame(processBatch);
        } else {
          // 处理完成
          resolve(results);
        }
      };
      
      // 开始处理第一批
      processBatch();
    });
  }
}