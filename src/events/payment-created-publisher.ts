import {AbstractPublisher, PaymentCreatedEvent, Subjects} from "@tktbitch/common";

export class PaymentCreatedPublisher extends AbstractPublisher<PaymentCreatedEvent>{
    readonly subject = Subjects.PaymentCreated;
}
