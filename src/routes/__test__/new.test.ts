import request from 'supertest';
import {app} from '../../app';
import mongoose from "mongoose";
import {getCookie, OrderStatus} from "@tktbch/common";
import {Order} from "../../models/order";
import {stripe} from "../../stripe";
import {Payment} from "../../models/payment";

const getMongoId = () => new mongoose.Types.ObjectId().toHexString();
jest.mock('../../stripe')
describe('POST /api/payments', () => {

    it('returns a 401 if a user is unauthenticated', async () => {
        return request(app)
            .post('/api/payments')
            .send({
                orderId: getMongoId(),
                token: 'insertokenhere'
            })
            .expect(401);
    })

    it('returns a 404 when the order does not exist', async () => {
        return request(app)
            .post('/api/payments')
            .set('Cookie', getCookie())
            .send({
                orderId: getMongoId(),
                token: 'insertokenhere'
            })
            .expect(404);
    })

    it('returns a 401 if a user tries to pay for another users order', async () => {
        const u1 = getMongoId();
        const u2 = getMongoId();
        const userOne = getCookie({
            email: 'u1@test.com',
            id: u1
        });
        const userTwo = getCookie({
            email: 'u2@test.com',
            id: u2
        });

        const order = Order.build({
            id: u1,
            userId: u1,
            status: OrderStatus.Created,
            price: 50,
            version: 0
        })
        await order.save();
        return request(app)
            .post('/api/payments')
            .set('Cookie', userTwo)
            .send({
                orderId: order.id,
                token: 'insertokenhere'
            })
            .expect(401)
    })

    it('returns a 400 if the order has been cancelled', async () => {
        const u1 = getMongoId();
        const userOne = getCookie({
            email: 'u1@test.com',
            id: u1
        });

        const order = Order.build({
            id: u1,
            userId: u1,
            status: OrderStatus.Cancelled,
            price: 50,
            version: 0
        })
        await order.save();
        return request(app)
            .post('/api/payments')
            .set('Cookie', userOne)
            .send({
                orderId: order.id,
                token: 'insertokenhere'
            })
            .expect(400)
    })

    it('returns a 201 if the payment is successful', async () => {
        const u1 = getMongoId();
        const userOne = getCookie({
            email: 'u1@test.com',
            id: u1
        });

        const order = Order.build({
            id: u1,
            userId: u1,
            status: OrderStatus.Created,
            price: 50,
            version: 0
        })
        await order.save();
        await request(app)
            .post('/api/payments')
            .set('Cookie', userOne)
            .send({
                orderId: order.id,
                token: 'insertokenhere'
            })
            .expect(201)
        const payment = await Payment.findOne({
            orderId: order.id
        })
        expect(payment).not.toBeNull();
        const chargeOpts = (stripe.charges.create as jest.Mock).mock.calls[0][0];
        expect(chargeOpts.amount).toEqual(order.price * 100);
    })

})
