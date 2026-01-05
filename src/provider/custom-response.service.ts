export default class CustomResponse{
    static error(arg0: string) {
      throw new Error('Method not implemented.');
    }
    public statusCode: number;
    public message: string
    public result : any 
    constructor(statusCode: number = 200,message:string,result?:any){
        this.statusCode = statusCode;
        this.message=message;
        this.result = result;

    }
}