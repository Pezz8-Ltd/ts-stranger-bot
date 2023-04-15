import ICommand from "./ICommand";

export default interface IMessageCommandMap {
    [command: string]: ICommand;
};