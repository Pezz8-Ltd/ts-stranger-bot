export default interface ICommand {
	fn(...args: any[]): any;                // Logic associated with the command

    name: string;
    aliases?: string;
    category?: string;
	description?: string;
	usage?: string;
}