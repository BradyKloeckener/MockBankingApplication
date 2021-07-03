drop database bank;
create database bank;
use bank;
 
show tables;

select * from customer;

create table customer(
id int unsigned,
first_name varchar(20) not null, 
last_name varchar(20) not null,
user_name varchar(30) not null,
pass_hash varchar(60) not null, 
primary key (id)
);
create table bank_account(
account_number int unsigned,
account_owner int unsigned not null,
balance int not null, 
primary key (account_number),
foreign key (account_owner) references customer(id) on delete cascade
);
create table signs(
signer int unsigned,
account_number int unsigned,
primary key (signer, account_number),
foreign key (signer) references customer(id) on delete cascade,
foreign key (account_number) references bank_account(account_number) on delete cascade
);
create table transaction(
transaction_num int unsigned,
sender_acc int unsigned,
receiver_acc int unsigned,
ammount int check (ammount>0),
time_stamp timestamp,
primary key (transaction_num),
foreign key (sender_acc) references bank_account(account_number) on delete cascade, 
foreign key (receiver_acc) references bank_account(account_number) on delete cascade 
);