import { Test, TestingModule } from '@nestjs/testing';
import { CopyTradeController } from './copy-trade.controller';

describe('CopyTradeController', () => {
  let controller: CopyTradeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CopyTradeController],
    }).compile();

    controller = module.get<CopyTradeController>(CopyTradeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
