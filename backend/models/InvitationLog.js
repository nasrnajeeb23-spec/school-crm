const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const InvitationLog = sequelize.define('InvitationLog', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'User who initiated the invitation'
        },
        schoolId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'School context'
        },
        targetType: {
            type: DataTypes.ENUM('Parent', 'Teacher', 'Staff'),
            allowNull: false,
            comment: 'Type of user being invited'
        },
        targetId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'ID of the invited user/parent/teacher'
        },
        action: {
            type: DataTypes.ENUM(
                'INVITE_SENT',
                'INVITE_FAILED',
                'INVITE_OPENED',
                'PASSWORD_SET',
                'TOKEN_EXPIRED',
                'TOKEN_REVOKED'
            ),
            allowNull: false,
            comment: 'Action performed'
        },
        channel: {
            type: DataTypes.ENUM('email', 'sms', 'manual'),
            allowNull: true,
            comment: 'Channel used for invitation'
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            comment: 'IP address of the requester'
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'User agent string'
        },
        success: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether the action succeeded'
        },
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Error message if failed'
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Additional metadata (email, phone, etc.)'
        },
        activationToken: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'Hashed activation token for tracking'
        },
        emailStatus: {
            type: DataTypes.ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'),
            allowNull: true,
            comment: 'Email delivery status'
        },
        smsStatus: {
            type: DataTypes.ENUM('sent', 'delivered', 'failed', 'undelivered'),
            allowNull: true,
            comment: 'SMS delivery status'
        }
    }, {
        tableName: 'invitation_logs',
        timestamps: true,
        indexes: [
            { fields: ['userId'] },
            { fields: ['targetType', 'targetId'] },
            { fields: ['schoolId'] },
            { fields: ['action'] },
            { fields: ['createdAt'] },
            { fields: ['ipAddress'] }
        ]
    });

    InvitationLog.associate = (models) => {
        InvitationLog.belongsTo(models.User, { foreignKey: 'userId', as: 'initiator' });
        InvitationLog.belongsTo(models.School, { foreignKey: 'schoolId', as: 'school' });
    };

    return InvitationLog;
};
