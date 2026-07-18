export enum StockMovementType {
  INBOUND = 'INBOUND', // received from supplier
  OUTBOUND = 'OUTBOUND', // shipped / consumed
  TRANSFER = 'TRANSFER', // moved between warehouses
  ADJUSTMENT = 'ADJUSTMENT', // manual correction (stocktake)
}
