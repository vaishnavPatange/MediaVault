import mongoose, { isValidObjectId } from "mongoose";
import {Tweet} from "../models/tweet.model.js";
import {ApiErrors} from "../utils/ApiErrors.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    
    const { content } = req.body;
    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    });

    if(!tweet) throw new ApiErrors(500, "Something went wrong while creating a tweet");

    return res.status(201)
    .json( new ApiResponse(
        201,
        tweet,
        "Tweet created successfully"
    ));

});

const getUserTweets = asyncHandler(async (req, res) => {
    
    const { userId } = req.params;
    if(!(isValidObjectId(userId))) throw new ApiErrors(400, "Invalid User-Id");

    const userTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
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
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        }
    ])

   if(!userTweets) throw new ApiErrors(500, "Something went wrong while finding tweets");

    if(userTweets.length === 0){
        return res.status(200)
        .json( new ApiResponse(
        200,
        {},
        "User has no tweets"
   ));
    }

   return res.status(200)
   .json( new ApiResponse(
        200,
        userTweets,
        "Tweets fetched successfully"
   ));

});

const updateTweet = asyncHandler(async (req, res) => {
    
    const { tweetId } = req.params;
    const { content } = req.body;
    if(!(isValidObjectId(tweetId))) throw new ApiErrors(400, "Invalid User-Id");

    const isOwner = await Tweet.findOne({_id: tweetId, owner: req.user?._id});
    if(!isOwner) throw new ApiErrors(401, "You are not owner of this tweet");

    const updatedTweet = await Tweet.findByIdAndUpdate(tweetId, {
        $set: {content: content}
    }, { new: true });

    if(!updateTweet) throw new ApiErrors(500, "Something went wrong while updating tweet");

    return res.status(200)
    .json( new ApiResponse(
        200,
        updateTweet,
        "Tweet updated successfully"
    ));

});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;
    if(!(isValidObjectId(tweetId))) throw new ApiErrors(400, "Invalid User-Id");

    const isOwner = await Tweet.findOne({_id: tweetId, owner: req.user?._id});
    if(!isOwner) throw new ApiErrors(401, "You are not owner of this tweet");

    await Tweet.findByIdAndDelete(tweetId);

    return res.status(200)
    .json( new ApiResponse(
        200,
        {},
        "Tweet deleted successfully"
    ));

});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}