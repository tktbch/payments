import express, {Request, Response} from 'express';
import {
    BadRequestError,
    NotAuthorizedError,
    NotFoundError,
    OrderStatus,
    requireAuth,
    validateRequest
} from "@tktbitch/common";
import {body} from "express-validator";
import {Order} from "../models/order";
import {stripe} from "../stripe";
import {Payment} from "../models/payment";
import {PaymentCreatedPublisher} from "../events/payment-created-publisher";
import {natsWrapper} from "../nats-wrapper";

const router = express.Router();

router.post('/api/payments', requireAuth, [
    body('token')
        .notEmpty(),
    body('orderId')
        .notEmpty()
], validateRequest, async (req: Request, res: Response) => {
    const {token, orderId} = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
        throw new NotFoundError();
    }
    if (order.userId !== req.currentUser!.id) {
        throw new NotAuthorizedError('Not Authorized');
    }
    if (order.status === OrderStatus.Cancelled) {
        throw new BadRequestError('Order has been cancelled.');
    }

    const {id: stripeId} = await stripe.charges.create({
        currency: 'usd',
        amount: order.price * 100,
        source: token
    })
    const payment = Payment.build({
        orderId,
        stripeId
    })
    await payment.save();
    await new PaymentCreatedPublisher(natsWrapper.client).publish({
        id: payment.id,
        orderId: payment.orderId,
        stripeId: payment.stripeId
    });
    res.status(201).send(payment);
})
export {router as createChargeRouter};
