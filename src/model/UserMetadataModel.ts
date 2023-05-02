import mongoose from "../config/database/mongoose";

const UserMetadataModel = mongoose.model<IUserMetadata>("UserMetadata", new mongoose.Schema<IUserMetadata>({
        _id: { type: String, required: true },
        nickname: String
    })
);
export default UserMetadataModel;

export interface IUserMetadata extends mongoose.Document {
    _id: string,
    nickname: string | undefined
}