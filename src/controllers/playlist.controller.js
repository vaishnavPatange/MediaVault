import mongoose, {isValidObjectId} from "mongoose";
import {Playlist} from "../models/playlist.model.js";
import {ApiErrors} from "../utils/ApiErrors.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {Video} from "../models/video.model.js";


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body;

    const isNameAvailabe = await Playlist.findOne({name: name, owner: req.user?._id});

    if(isNameAvailabe){
        return res.status(400)
        .json( new ApiResponse(
            400,
            "Playlist with this name already exists"
        ) );
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    });

    return res.status(201)
    .json( new ApiResponse(
        201,
        playlist,
        "Playlist created successfully"
    ));

});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params;

    const isUserIdValid = isValidObjectId(userId);

    if(!isUserIdValid) throw new ApiErrors(400, "Invalid Playlist id");

    const playlists = await Playlist.find({owner: userId});

    if(!playlists) throw new ApiErrors(404, "No playlist found");

    return res.status(200)
    .json( new ApiResponse(
        200,
        playlists,
        "Playlists fetched successfully"
    ));

});

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    
    const isPlaylistIdValid = isValidObjectId(playlistId);

    if(!isPlaylistIdValid) throw new ApiErrors(400, "Invalid Playlist id");

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "playlistVideos",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [{
                                $project: {
                                    username: 1,
                                    fullname:1,
                                    avatar: 1
                                }
                            }]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        },
    ]);

    if(!playlist) throw new ApiErrors(404, "Playlist not found");

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            playlist[0],
            "Playlist fetched successfully"
        )
    );

});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;

    const isPlaylistIdValid = isValidObjectId(playlistId);
    const isVideoIdValid = isValidObjectId(videoId);

    if(!(isPlaylistIdValid && isVideoIdValid)) throw new ApiErrors(400, "Invalid Playlist id or Video id");

   const doesPlaylistExists = await Playlist.findById(playlistId);
   const doesVideoExists = await Video.findById(videoId);

   if(!(doesPlaylistExists && doesVideoExists)) throw new ApiErrors(404, "Playlist or Video not found");

   const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $push: {videos: videoId}
        }, { new : true }
   );

   if(!updatePlaylist) throw new ApiErrors(500, "Something went wrong while adding video");

   return res.status(200)
   .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Video added successfully"
        )
   );

});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;

    const isPlaylistIdValid = isValidObjectId(playlistId);
    const isVideoIdValid = isValidObjectId(videoId);

    if(!(isPlaylistIdValid && isVideoIdValid)) throw new ApiErrors(400, "Invalid Playlist id or Video id");

   const doesPlaylistExists = await Playlist.findById(playlistId);
   const doesVideoExists = await Video.findById(videoId);

   if(!(doesPlaylistExists && doesVideoExists)) throw new ApiErrors(404, "Playlist or Video not found");

   const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {videos: videoId}
        }, { new : true }
   );

   if(!updatePlaylist) throw new ApiErrors(500, "Something went wrong while removing video");

   return res.status(200)
   .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Video removed successfully"
        )
   );

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;

    const isPlaylistIdValid = isValidObjectId(playlistId);

    if(!isPlaylistIdValid) throw new ApiErrors(400, "Invalid Playlist id");

    const deletePlaylist = await Playlist.deleteOne({_id: playlistId});

    if(deletePlaylist.deletedCount === 0) throw new ApiErrors(404, "Playlist not found");

    return res.status(200)
    .json( new ApiResponse(
        200,
        "Playlist deleted successfully"
    ));

});

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    const isPlaylistIdValid = isValidObjectId(playlistId);

    if(!isPlaylistIdValid) throw new ApiErrors(400, "Invalid Playlist id");

    const doesPlaylistExists = await Playlist.findById(playlistId);

   if(!(doesPlaylistExists && doesVideoExists)) throw new ApiErrors(404, "Playlist not found");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                name: name,
                description: description
            },
            { new: true }
    );

    if(!updatePlaylist) throw new ApiErrors(400, "Somethign went wrong while updating playlist details");

    return res.status(200)
    .json( new ApiResponse(
        200,
        updatePlaylist,
        "Playlist details updated successfully"
    ));

});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}