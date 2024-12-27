import mongoose, {isValidObjectId} from "mongoose"
import { Subscription } from "../models/subscription.model.js"
import {ApiErrors} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId)) throw new ApiErrors(400, "Invalid Channel id");

    const isSubscribed = await Subscription.findOne({channel: channelId, subscriber: req.user?._id});

    if(isSubscribed){
        await Subscription.deleteOne({channel: channelId, subscriber: req.user?._id});

        return res.status(200)
        .json( new ApiResponse(
            200,
            {subscribed: false},
            "Channel Unsubscribed"
        ))
    }

    const subscribed = await Subscription.create({
        channel: channelId, subscriber: req.user?._id
    });

    if(!subscribed) throw new ApiErrors(500, "Something went wrong while toggling subscription");

    return res.status(200)
    .json( new ApiResponse(
        200,
        {subscribed: false},
        "Channel Subscribed"
    ))

})


const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params;

    if(!isValidObjectId(channelId)) throw new ApiErrors(400, "Invalid Channel id");

    const subscribers = await Subscription.aggregate([
        {
            $match: { channel: channelId }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullname: 1
                        }
                    }
                ]
            }
        }
    ]);
    
    if(subscribers.length === 0){
        return res.status(200)
        .json( new ApiResponse(
            200,
            {subs: 0},
            "No subscriber yet"
        ))
    }
    
    const subsCount = await Subscription.countDocuments({channel: channelId});

    return res.status(200)
    .json( new ApiResponse( 
        200,
        {subscribers, subsCount},
        "User channel fetched successfully"
    ));

});


const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)) throw new ApiErrors(400, "Invalid Channel id");

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: { subscriber: subscriberId }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullname: 1
                        }
                    }
                ]
            }
        },
    ]);
    
    if(subscribedChannels.length === 0){
        return res.status(200)
        .json( new ApiResponse(
            200,
            {subs: 0},
            "Not subscribed to any channel yet"
        ))
    }
    
    const subsCount = await Subscription.countDocuments({channel: channelId});

    return res.status(200)
    .json( new ApiResponse(
        200,
        {subscribedChannels, subsCount},
        "User channel fetched successfully"
    ));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}