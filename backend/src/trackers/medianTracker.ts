import {
  MinPriorityQueue,
  MaxPriorityQueue,
} from "@datastructures-js/priority-queue";
import logger from "../utils/logger";
import { AddCandleData } from "../services/MarketDataManager";

class MedianTracker {
  private lower: MaxPriorityQueue<number>;
  private upper: MinPriorityQueue<number>;
  private lookback: number;
  private medians: number[] = [];

  constructor(numbers: number[], lookback: number) {
    this.lookback = lookback;
    this.lower = new MaxPriorityQueue();
    this.upper = new MinPriorityQueue();
    logger.debug(`Initializing MedianTracker with numbers: ${numbers}`);
    for (let i = 0; i < numbers.length; i++) {
      this.add(numbers[i]);

      if (i >= lookback - 1) {
        this.medians.push(this.getMedian());
        this.remove(numbers[i - lookback + 1]);
      }
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
    return this.getMedian();
  }

  private remove(x: number): boolean {
    logger.debug(`Attempting to remove number: ${x}`);
    if (this.lower.isEmpty() && this.upper.isEmpty()) {
      logger.warn("Cannot remove number: Queues are empty.");
      return false;
    }

    let removed = false;
    if (this.lower.toArray().includes(x)) {
      const newLower = new MaxPriorityQueue<number>();
      this.lower
        .toArray()
        .filter((num: number) => num !== x)
        .forEach((num) => newLower.enqueue(num));
      this.lower = newLower;
      removed = true;
    } else if (this.upper.toArray().includes(x)) {
      const newUpper = new MinPriorityQueue<number>();
      this.upper
        .toArray()
        .filter((num: number) => num !== x)
        .forEach((num) => newUpper.enqueue(num));
      this.upper = newUpper;
      removed = true;
    }

    if (!removed) {
      logger.warn(`Number ${x} not found in either queue.`);
      return false;
    }

    this.balance();
    logger.debug(
      `Removed number: ${x}. Lower size: ${this.lower.size()}, Upper size: ${this.upper.size()}`
    );
    return true;
  }

  public getMedian(): number {
    if (this.lower.isEmpty() && this.upper.isEmpty()) {
      logger.warn("Cannot calculate median: Queues are empty.");
      return 0;
    }
    const median =
      this.lower.size() > this.upper.size()
        ? this.lower.front()!
        : (this.lower.front()! + this.upper.front()!) / 2;
    logger.debug(`Calculated median: ${median}`);
    return median;
  }
}

export default MedianTracker;
