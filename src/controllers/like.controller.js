import mongoose, {isValidObjectId} from "mongoose";
import {Like} from "../models/like.model.js";
import {ApiErrors} from "../utils/ApiErrors.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {Video} from "../models/video.model.js";
import {Comment} from "../models/comment.model.js";
import {Tweet} from "../models/tweet.model.js";


const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const userId = req.user?._id;

    if(!isValidObjectId(videoId)) throw new ApiErrors(400, "Invalid VideoId");

    const doesVideoExists = await Video.findById(videoId);
    if(!doesVideoExists) throw new ApiErrors(404, "Video does not exists");

    const isLiked = await Like.findOne({video: videoId, user: userId});

    if (!isLiked) {
        await Like.create({
            video: videoId,
            likedBy: userId
        });

        res.status(200)
        .json( new ApiResponse(201, {like: true}, "liked") );

    } else{
        await Like.deleteOne({video: videoId, user: userId});

        res.status(200)
        .json( new ApiResponse(200, {like: false}, "unliked") );
    }

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const userId = req.user?._id;

    if(!isValidObjectId(commentId)) throw new ApiErrors(400, "Invalid CommentId");

    const doesCommentExists = await Comment.findById(commentId);
    if(!doesCommentExists) throw new ApiErrors(404, "Comment does not exists");

    const isLiked = await Comment.findOne({comment: commentId, user: userId});

    if (!isLiked) {
        await Like.create({
            comment: commentId,
            likedBy: userId
        });

        res.status(200)
        .json( new ApiResponse(201, {like: true}, "liked") );

    } else{
        await Comment.deleteOne({comment: commentId, user: userId});

        res.status(200)
        .json( new ApiResponse(200, {like: false}, "unliked") );
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    const userId = req.user?._id;

    if(!isValidObjectId(tweetId)) throw new ApiErrors(400, "Invalid TweetId");

    const doesTweetExists = await Tweet.findById(tweetId);
    if(!doesTweetExists) throw new ApiErrors(404, "Tweet does not exists");

    const isLiked = await Tweet.findOne({tweet: tweetId, user: userId});

    if (!isLiked) {
        await Tweet.create({
            tweet: tweetId,
            likedBy: userId
        });

        res.status(200)
        .json( new ApiResponse(201, {like: true}, "liked") );

    } else{
        await Tweet.deleteOne({tweet: tweetId, user: userId});

        res.status(200)
        .json( new ApiResponse(200, {like: false}, "unliked") );
    }
}
);

const getLikedVideos = asyncHandler(async (req, res) => {
    
    userId = req.user?._id;

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: {$exits: true}
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username:1,
                                        fullname: 1,
                                        avatar:1
                                    }
                                }
                            ]
                        },
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

    res.status(200)
    .json(
        new ApiResponse(
            200,
            {likedVideos, count: likedVideos.length},
            "Liked videos fetched successfully"
        )
    )

});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}