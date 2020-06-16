import {OrderCreatedListener} from "../order-created-listener";
import {natsWrapper} from "../../nats-wrapper";
import mongoose from "mongoose";
import {OrderCreatedEvent, OrderStatus} from "@tktbch/common";
import {Message} from "node-nats-streaming";
import {Order} from "../../models/order";

const getMongoId = () => new mongoose.Types.ObjectId().toHexString();
const setup = () => {
    const listener = new OrderCreatedListener(natsWrapper.client);
    const data: OrderCreatedEvent['data'] = {
        id: getMongoId(),
        version: 0,
        expiresAt: 'sometime',
        userId: getMongoId(),
        status: OrderStatus.Created,
        ticket: {
            id: getMongoId(),
            price: 10
        }
    }

    // @ts-ignore
    const msg: Message = {
        ack: jest.fn()
    }
    return {listener, data, msg};
}

describe('payments: OrderCreatedListener', () => {

    it('replicates the order info', async () => {
        const { listener, data, msg } = await setup();
        await listener.onMessage(data, msg);
        const order = await Order.findById(data.id);
        expect(order).toBeDefined();
        expect(order!.price).toEqual(data.ticket.price);
    })

    it('ack the message', async () => {
        const { listener, data, msg } = await setup();
        await listener.onMessage(data, msg);
        expect(msg.ack).toHaveBeenCalled();
    })
})
