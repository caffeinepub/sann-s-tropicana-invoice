import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Float "mo:core/Float";



actor {
  type DiscountType = {
    #rupees;
    #percentage;
  };

  type RoomCategory = {
    #single;
    #standard;
    #deluxe;
    #twin;
  };

  public type Invoice = {
    invoiceNumber : Text;
    invoiceDate : Text;
    guestName : Text;
    guestAddress : Text;
    guestGST : Text;
    checkIn : Text;
    checkOut : Text;
    roomCategory : Text;
    roomNumber : Text;
    tariffPerNight : Float;
    includeBreakfast : Bool;
    breakfastCharge : Float;
    isHourly : Bool;
    hours : Float;
    hourlyRate : Float;
    discountValue : Float;
    discountType : Text;
    discountAmount : Float;
    nights : Nat;
    roomAmount : Float;
    breakfastAmount : Float;
    taxableAmount : Float;
    sgst : Float;
    cgst : Float;
    grandTotal : Float;
    createdAt : Int;
    notes : Text;
  };

  var nextInvoiceNumber = 1;

  let invoices = Map.empty<Text, Invoice>();

  func roundFloat(f : Float) : Float {
    let remainder = f % 1.0;
    if (remainder >= 0.5) {
      (remainder - 1.0) + f;
    } else {
      f - remainder;
    };
  };

  func generateInvoiceNumber() : Text {
    "INV-" # nextInvoiceNumber.toText();
  };

  func calculateRoomAmount(tariffPerNight : Float, nights : Nat, hourlyRate : Float, hours : Float, isHourly : Bool) : Float {
    if (isHourly) {
      hourlyRate * hours;
    } else {
      tariffPerNight * nights.toFloat();
    };
  };

  func calculateBreakfastAmount(breakfastCharge : Float, nights : Nat, includeBreakfast : Bool) : Float {
    if (includeBreakfast) {
      breakfastCharge * nights.toFloat();
    } else {
      0.0;
    };
  };

  func calculateDiscountAmount(discountValue : Float, discountType : Text, amount : Float) : Float {
    if (discountType == "percentage") {
      amount * discountValue / 100.0;
    } else {
      discountValue;
    };
  };

  func calculateTaxableAmount(roomAmount : Float, breakfastAmount : Float, discountAmount : Float) : Float {
    let total = roomAmount + breakfastAmount - discountAmount;
    if (total < 0.0) { 0.0 } else { total };
  };

  func calculateGST(taxableAmount : Float) : Float {
    taxableAmount * 0.025;
  };

  func calculateGrandTotal(taxableAmount : Float, sgst : Float, cgst : Float) : Float {
    roundFloat(taxableAmount + sgst + cgst);
  };

  func applyCalculations(invoice : Invoice) : Invoice {
    let roomAmount = calculateRoomAmount(invoice.tariffPerNight, invoice.nights, invoice.hourlyRate, invoice.hours, invoice.isHourly);
    let breakfastAmount = calculateBreakfastAmount(invoice.breakfastCharge, invoice.nights, invoice.includeBreakfast);
    let discountAmount = calculateDiscountAmount(invoice.discountValue, invoice.discountType, roomAmount + breakfastAmount);
    let taxableAmount = calculateTaxableAmount(roomAmount, breakfastAmount, discountAmount);
    let sgst = calculateGST(taxableAmount);
    let cgst = calculateGST(taxableAmount);
    let grandTotal = calculateGrandTotal(taxableAmount, sgst, cgst);

    {
      invoice with
      roomAmount;
      breakfastAmount;
      discountAmount;
      taxableAmount;
      sgst;
      cgst;
      grandTotal;
    };
  };

  public shared ({ caller }) func createInvoice(invoice : Invoice) : async Text {
    let invoiceNumber = generateInvoiceNumber();
    let currentTime = Time.now();
    let calculatedInvoice : Invoice = applyCalculations({
      invoice with
      invoiceNumber;
      createdAt = currentTime;
    });

    invoices.add(invoiceNumber, calculatedInvoice);
    nextInvoiceNumber += 1;
    invoiceNumber;
  };

  public query ({ caller }) func getInvoice(invoiceNumber : Text) : async Invoice {
    switch (invoices.get(invoiceNumber)) {
      case (null) { Runtime.trap("Invoice not found") };
      case (?invoice) { invoice };
    };
  };

  public shared ({ caller }) func updateInvoice(invoiceNumber : Text, invoice : Invoice) : async () {
    if (not invoices.containsKey(invoiceNumber)) {
      Runtime.trap("Invoice not found");
    };
    let updatedInvoice : Invoice = applyCalculations({
      invoice with
      invoiceNumber;
      createdAt = Time.now();
    });
    invoices.add(invoiceNumber, updatedInvoice);
  };

  public shared ({ caller }) func deleteInvoice(invoiceNumber : Text) : async () {
    if (not invoices.containsKey(invoiceNumber)) {
      Runtime.trap("Invoice not found");
    };
    invoices.remove(invoiceNumber);
  };

  public query ({ caller }) func listInvoices() : async [Invoice] {
    invoices.values().toArray();
  };

  public query ({ caller }) func getInvoicesByDateRange(startDate : Text, endDate : Text) : async [Invoice] {
    let iter = invoices.values();
    iter.filter(func(invoice) { invoice.invoiceDate >= startDate and invoice.invoiceDate <= endDate }).toArray();
  };

  public query ({ caller }) func getNextInvoiceNumber() : async Text {
    generateInvoiceNumber();
  };
};

