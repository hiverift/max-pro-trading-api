import { HttpException, HttpStatus } from '@nestjs/common';

const throwException = (message: any) => {
  throw new HttpException(
    {
      status: HttpStatus.BAD_REQUEST,
      message: message?.message,
    },
    HttpStatus.BAD_REQUEST,
    {
      cause: message,
    },
  );
};

export { throwException };
