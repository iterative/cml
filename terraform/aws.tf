variable "type" {
  type    = string
  default = "t2.micro"
}

provider "aws" {
  profile = "default"
  region  = "us-west-1"
}

resource "random_id" "run" {
  byte_length = 8
}

resource "tls_private_key" "private_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "ubuntu" {
  key_name   = "${random_id.run.dec}"
  public_key = "${tls_private_key.private_key.public_key_openssh}"
}

# resource "aws_key_pair" "ubuntu" {
#   key_name   = "ubuntu"
#   public_key = file("${var.public_key}")
# }

resource "aws_security_group" "ubuntu" {
  name        = "ubuntu-security-group-${aws_key_pair.ubuntu.key_name}"
  description = "Allow HTTP, HTTPS and SSH traffic"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "cml"
  }
}


resource "aws_instance" "ubuntu" {
  key_name      = aws_key_pair.ubuntu.key_name
  ami           = "ami-03ba3948f6c37a4b0"
  instance_type = var.type

  tags = {
    Name = "cml"
  }

  vpc_security_group_ids = [
    aws_security_group.ubuntu.id
  ]

  # connection {
  #   type        = "ssh"
  #   user        = "ubuntu"
  #   private_key = file("key")
  #   host        = self.public_ip
  # }

  # ebs_block_device {
  #   device_name = "/dev/sda1"
  #   volume_type = "gp2"
  #   volume_size = 30
  # }
}

# resource "aws_eip" "ubuntu" {
#   vpc      = true
#   instance = aws_instance.ubuntu.id
# }