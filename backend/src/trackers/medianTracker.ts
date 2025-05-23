import {
  MinPriorityQueue,
  MaxPriorityQueue,
} from "@datastructures-js/priority-queue";
import logger from "../utils/logger";
import { AddCandleData, Timeframe } from "../services/MarketDataManager";
import { KlineDataExtracted } from "../data/fetchKlineData";

class MedianTracker {
  private lower: MaxPriorityQueue<number>;
  private upper: MinPriorityQueue<number>;
  private lookback: number;
  private medians: number[] = [];
  private symbol: string;
  private timeframe: Timeframe;

  constructor(
    symbol: string,
    timeframe: Timeframe,
    klineData: KlineDataExtracted,
    lookback: number
  ) {
    this.symbol = symbol;
    this.timeframe = timeframe;
    const numbers = klineData.volumes;
    this.lookback = lookback;
    this.lower = new MaxPriorityQueue();
    this.upper = new MinPriorityQueue();
    logger.debug(`Initializing MedianTracker with numbers: ${numbers}`);
    for (let i = 0; i < numbers.length; i++) {
      if (i >= lookback) {
        this.remove(numbers[i - lookback]);
        this.add(numbers[i]);
        this.medians.push(this.getValue());
        continue;
      }
      this.add(numbers[i]);
    }
  }

  private balance(): void {
    logger.debug(
      `Balancing queues. Lower size: ${this.lower.size()}, Upper size: ${this.upper.size()}`
    );
    while (this.lower.size() > this.upper.size() + 1) {
      const value = this.lower.dequeue();
      if (value !== null) this.upper.enqueue(value);
    }

    while (this.upper.size() > this.lower.size()) {
      const value = this.upper.dequeue();
      if (value !== null) this.lower.enqueue(value);
    }
    logger.debug(
      `Balanced queues. Lower size: ${this.lower.size()}, Upper size: ${this.upper.size()}`
    );
  }
  public update(
    newCandle: AddCandleData,
    firstCandle: AddCandleData,
    lastCandle: AddCandleData
  ) {
    this.remove(firstCandle.volume);
    this.add(newCandle.volume);
  }
  private add(x: number): number {
    logger.debug(`Adding number: ${x}`);
    if (this.lower.isEmpty() || x < this.lower.front()!) {
      this.lower.enqueue(x);
    } else {
      this.upper.enqueue(x);
    }
    this.balance();
    logger.debug(
      `After adding ${x}. Lower size: ${this.lower.size()}, Upper size: ${this.upper.size()}`
    );
    this.medians.push(this.getValue());
    return this.getValue();
  }

  private remove(x: number): boolean {
    logger.debug(`Attempting to remove number: ${x}`);
    if (this.lower.isEmpty() && this.upper.isEmpty()) {
      logger.warn("Cannot remove number: Queues are empty.");
      return false;
    }

    let removed = false;
    if (this.lower.toArray().includes(x)) {
      const arr = this.lower.toArray();
      const idx = arr.indexOf(x);
      if (idx === -1) return false;

      arr.splice(idx, 1);
      const newLower = new MaxPriorityQueue<number>();
      for (const n of arr) {
        newLower.enqueue(n);
      }
      this.lower = newLower;
      removed = true;
    } else if (this.upper.toArray().includes(x)) {
      const arr = this.upper.toArray();
      const idx = arr.indexOf(x);
      if (idx === -1) return false;

      arr.splice(idx, 1);
      const newUpper = new MinPriorityQueue<number>();
      for (const n of arr) {
        newUpper.enqueue(n);
      }
      this.upper = newUpper;
      removed = true;
    }

    if (!removed) {
      logger.warn(
        `Number ${x} not found in either queue for ${this.symbol}${this.timeframe}.`
      );
      return false;
    }

    this.balance();
    logger.debug(
      `Removed number: ${x}. Lower size: ${this.lower.size()}, Upper size: ${this.upper.size()}`
    );
    return true;
  }

  public getValue(params?: { index: number }): number {
    const index = params?.index ?? -1;

    if (index !== -1) {
      if (index < 0 || index >= this.medians.length) {
        logger.warn(`Invalid Median Volume index ${index}.`);
        return 0;
      }
      return this.medians[index];
    }

    if (this.lower.isEmpty() && this.upper.isEmpty()) {
      logger.warn("Cannot calculate median: Queues are empty.");
      return 0;
    }
    const lowerFront = this.lower.front()!;
    const upperFront = this.upper.front()!;
    if (this.lower.size() === this.upper.size()) {
      return (lowerFront + upperFront) / 2;
    }

    return this.lower.size() > this.upper.size() ? lowerFront : upperFront;
  }
  public getAll(): number[] {
    return this.medians;
  }
}

export default MedianTracker;
