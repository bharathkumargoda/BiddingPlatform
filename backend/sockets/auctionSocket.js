const Item = require('../models/item');
const Auction = require("../models/auction");
const { writeBidToRedis, readBidHistoryFromRedis, updateCurrentPriceInRedis } = require('./redisHelper');
const {redisClient, connectRedis}  = require('../db/redis');

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        // Client joins an auction room
        socket.on('joinAuction', async ({ auctionId }) => {
            socket.join(auctionId);
            console.log(`Client ${socket.id} joined auction room: ${auctionId}`);

            // Fetch bid history from Redis for the item and send to client
            const itemId = auctionId; // Assuming auctionId == itemId
            const bidHistory = await readBidHistoryFromRedis(itemId);

            // Send the current bid history to the client
            socket.emit('bidHistory', bidHistory);
        });

        // Handle bid placement via WebSocket
        socket.on('placeBid', async ({ itemId, userId, bidAmount }) => {
            let auction;
            try {
                const item = await Item.findById(itemId);
                if (item) {
                    console.log("Item", item)
                    const auction = await Auction.findById(item.auction);
                    console.log('Manually fetched auction details:', auction);
                } else {
                    console.log('Item not found');
                }

                if (bidAmount < item.currentPrice + item.minimumBidIncrement) {
                    return socket.emit('bidError', 'Bid must be higher than the current price by the minimum increment.');
                }

                const newBid = { userId, amount: bidAmount, timestamp: new Date() };
                item.bids.push(newBid);
                item.currentPrice = bidAmount;
                await item.save();

                await redisClient.set(`item:${itemId}`, JSON.stringify(item), { EX: 300 });
                io.to(auction._id.toString()).emit('newBid', { itemId: item._id, bids: item.bids });
            } catch (error) {
                console.error('Error placing bid:', error);
                socket.emit('bidError', 'Error processing bid.');
            }
        });

        // Disconnect WebSocket
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};

module.exports = socketHandler;






























// const Item = require('../models/item');
// const redisClient = require('../db/redis');
// const mongoose = require('mongoose');

// const socketHandler = (io) => {
//     io.on('connection', (socket) => {
//         console.log('New client connected:', socket.id);

//         // Client joins an auction room
//         socket.on('joinAuction', async ({ auctionId }) => {
//             socket.join(auctionId);
//             console.log(`Client ${socket.id} joined auction room: ${auctionId}`);
//         });

//         // Handle bid placement via WebSocket
//         socket.on('placeBid', async ({ itemId, userId, bidAmount }) => {
//             try {
//                 // Fetch item from MongoDB
//                 // Fetch item from MongoDB
//                 let item = await Item.findById(itemId); // Get item without population
//                 console.log('Item before populating auction:', item);

//                 // Now populate the auction
//                 item = await item.populate('auction');
//                 console.log('Item after populating auction:', item);


//                 const userObjectId = new mongoose.Types.ObjectId(userId);

//                 if (!item) {
//                     return socket.emit('bidError', 'Item not found.');
//                 }

//                 // Validate bid amount against current price and minimum increment
//                 if (bidAmount < item.currentPrice + item.minimumBidIncrement) {
//                     return socket.emit('bidError', 'Bid must be higher than the current price by the minimum increment.');
//                 }

//                 // Create new bid with a timestamp
//                 const newBid = {
//                     userId: userObjectId,  // Convert userId to ObjectId
//                     amount: bidAmount,
//                     timestamp: new Date(),
//                 };

//                 // Update bid history and current price
//                 item.bids.push(newBid);
//                 item.currentPrice = bidAmount;
//                 console.log("Auctions", item);
//                 await item.save();

//                 // Update Redis cache for item
//                 // await redisClient.set(`item:${itemId}`, JSON.stringify(item), { EX: 300 });  // Cache for 5 minutes

//                 // Broadcast the new bid to everyone in the auction room
//                 io.to(item.auction._id).emit('newBid', { itemId: item._id, bids: item.bids });
//             } catch (error) {
//                 console.error('Error placing bid:', error);
//                 socket.emit('bidError', 'Error processing bid.');
//             }
//         });

//         // Disconnect WebSocket
//         socket.on('disconnect', () => {
//             console.log('Client disconnected:', socket.id);
//         });
//     });
// };

// module.exports = socketHandler;
