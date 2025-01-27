import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const cloudinaryUpload = async (localFilePath) => {
    try {
        if(!localFilePath) return null; // if file is not availabel on server/local
        // uploading file
        const response = await cloudinary.uploader.upload(localFilePath, {resource_type: "auto"})
        // if file is successfully upload
        // console.log(response);

        fs.unlinkSync(localFilePath); // to delete file from server Sync means this has to work

        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null
    }
};

const cloudinaryDelete = async (publicId, resourceType) => {
    try {
        const response = await cloudinary.uploader.destroy(publicId, {resource_type: resourceType});
        console.log(response);
        
        if(response) console.log("File deleted successfully");
        return response;
    } catch (error) {
        console.log("Something went wrong while deleting file", error);
        
    }
}

export {cloudinaryUpload,
        cloudinaryDelete
};