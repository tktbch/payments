import {OrderCancelledListener} from "../order-cancelled-listener";
import {natsWrapper} from "../../nats-wrapper";
import {OrderCancelledEvent, OrderStatus} from "@tktbch/common";
import {Message} from "node-nats-streaming";
import mongoose from "mongoose";
import {Order} from "../../models/order";

const getMongoId = () => new mongoose.Types.ObjectId().toHexString();

const setup = async () => {
    const listener = new OrderCancelledListener(natsWrapper.client);
    const order = Order.build({
        id: getMongoId(),
        version: 0,
        userId: getMongoId(),
        status: OrderStatus.Created,
        price: 20
    })
    await order.save();

    const data: OrderCancelledEvent['data'] = {
        id: order.id,
        version: order.version,
        ticket: {
            id: getMongoId()
        }
    }

    // @ts-ignore
    const msg: Message = {
        ack: jest.fn()
    }

    return { listener, order, data, msg };
}

describe('OrderCancelledListener', () => {

    it('it updates the order status', async () => {
        const {listener, data, msg, order} = await setup();
        await listener.onMessage(data, msg);
        const replicatedOrder = await Order.findById(data.id);
        expect(replicatedOrder!.status).toEqual(OrderStatus.Cancelled);
    })

    it('acks the message', async () => {
        const {listener, data, msg, order} = await setup();
        await listener.onMessage(data, msg);
        expect(msg.ack).toHaveBeenCalled();
    })

})
