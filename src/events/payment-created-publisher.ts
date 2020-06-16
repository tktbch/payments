import {AbstractPublisher, PaymentCreatedEvent, Subjects} from "@tktbch/common";

export class PaymentCreatedPublisher extends AbstractPublisher<PaymentCreatedEvent>{
    readonly subject = Subjects.PaymentCreated;
}
