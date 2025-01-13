import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
// import {User} from "../models/user.model.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { cloudinaryUpload, cloudinaryDelete } from "../utils/cloudinary.js";
import { ApiErrors } from "../utils/ApiErrors.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    
    const pageNo = parseInt(page);
    const pageLimit = parseInt(limit);
    const skip = (pageNo -1) * pageLimit;

    const pipeline = [];

    const matchStage = {};
    if(query && query.trim() !== ""){
        matchStage.$or = [
            { title: { $regex: query, $options: "i"}},
            { description: { $regex: query, $options: "i"}}
        ]
    }

    if(userId){
        matchStage.owner = userId;
    }

    if(Object.keys(matchStage).length > 0){
        pipeline.push({$match: matchStage});
    }

    if(sortBy && sortType){
        const sortStage = {
            $sort: {[sortBy]: parseInt(sortType)}
        }
        pipeline.push(sortStage);
    }

    if(skip > 0){
        pipeline.push({$skip: skip});
    }

    pipeline.push({$limit: pageLimit});

    const videos = await Video.aggregate(pipeline);

    const totalVideos = await Video.countDocuments(filter);
    const totalPages = Math.ceil(totalVideos/pageLimit);

    return res.status(200)
    .json(
        new ApiResponse(
            200,            
            {    
                videos,
                pageNumber: pageNo,
                totalVideos,
                totalPages,
                limit: pageLimit,
                hasNextPage: pageNo < totalPages,
                hasPrevPage: 0 < pageNo
            },
            "Videos fetched successfully"
        )
    )
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body;

    if([title, description].some(
        (field) => field?.trim() === ""
    )) {throw new ApiErrors(400, "Both the fields are required");}

    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if(!(videoLocalPath && thumbnailLocalPath)) throw new ApiErrors(400, "Both video file and thumbnail is required");

    const video = await cloudinaryUpload(videoLocalPath);
    const thumbnail = await cloudinaryUpload(thumbnailLocalPath);

    if(!(video && thumbnail)) throw new ApiErrors(500, "Something went wrong while uploading files");

    const publishedVideo = await Video.create({
        videoFile: video.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: video.duration,
        isPublished: true,
        owner: req.user?._id
    });

    if(!publishedVideo) throw new ApiErrors(500, "Something went wrong while publishing video");

    return res.status(201)
    .json( new ApiResponse(
        201,
        publishedVideo,
        "Video published successfully"
    ));

});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if(!(isValidObjectId(videoId))) throw new ApiErrors(400, "Invalid video Id");

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project:{
                            username: 1,
                            fullname: 1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        }
    ]);

    if(!video) throw new ApiErrors(404, "Video not found");

    return res.status(200)
    .json( new ApiResponse(
        200,
        video,
        "Video fetched successfully"
    ));
    
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const {title, description} = req.body;

    if(!(isValidObjectId(videoId))) throw new ApiErrors(400, "Invalid video Id");

    const doesVideoExistsAndisOwner = await Video.findOne({_id: videoId, owner: req.user?._id});

    if(!doesVideoExistsAndisOwner) throw new ApiErrors( 404, "Video does not exists or You are not the owner of this video");

    let thumbnailLocalPath;
    if(req.file) thumbnailLocalPath = req.file?.path;
    
    const uploadedThumbnail = await cloudinaryUpload(thumbnailLocalPath);
    
    if(!uploadedThumbnail) throw new ApiErrors(500, "Something went wrong while uploading thumbnail");

    console.log(doesVideoExistsAndisOwner.thumbnail);
    

    await cloudinaryDelete(doesVideoExistsAndisOwner.thumbnail, "image");

    const updatedVideoDetails = await Video.findByIdAndUpdate(videoId, {
        $set: {
            title,
            description,
            thumbnail: uploadedThumbnail.url
        }
    }, {new : true});

    return res.status(200)
    .json( new ApiResponse(
        200,
        updatedVideoDetails,
        "Video details updated successfully"
    ));

});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if(!(isValidObjectId(videoId))) throw new ApiErrors(400, "Invalid video Id");
    
    const doesVideoExistsAndisOwner = await Video.findOne({_id: videoId, owner: req.user?._id});

    if(!doesVideoExistsAndisOwner) throw new ApiErrors( 404, "Video does not exists or You are not the owner of this video");

    await cloudinaryDelete(doesVideoExistsAndisOwner.videoFile, 
        resourceType="video");
    await cloudinaryDelete(doesVideoExistsAndisOwner.thumbnail, 
        resourceType="image");

    const deletedVideo = await Video.findByIdAndDelete(videoId);
    
    if(deletedVideo.deleteCount === 0) throw new ApiErrors(500, "Something went wrong while deleteing this video");

    return res.status(200)
    .json( new ApiResponse(
        200,
        {},
        "Video deleted successfully"
    ));

});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!(isValidObjectId(videoId))) throw new ApiErrors(400, "Invalid video Id");
    
    const doesVideoExistsAndisOwner = await Video.findOne({_id: videoId, owner: req.user?._id});

    if(!doesVideoExistsAndisOwner) throw new ApiErrors( 404, "Video does not exists or You are not the owner of this video");

    if(doesVideoExistsAndisOwner.isPublished){
        doesVideoExistsAndisOwner.isPublished = false;
    } else{
        doesVideoExistsAndisOwner.isPublished = true;
    };

    const updatedVideoStatus = await doesVideoExistsAndisOwner.save({validateBeforeSave: false});

    return res.status(200)
    .json( new ApiResponse(
        200,
        updatedVideoStatus,
        "Video publish status updated successfully"
    ));

});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}