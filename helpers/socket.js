class SocketHelper {
  static io = null;
  static socket = null;

  static getIo() {
    return this.io;
  }

  static setIo(data) {
    this.io = data;
    console.log("=> Socket Io initiated successfully");
    return null;
  }

  static getSocket() {
    return this.socket;
  }

  static setSocket(data) {
    this.socket = data;
    return null;
  }
}

export default SocketHelper;
